import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Button, InfoBox, Panel, Label } from '@playcanvas/pcui/react';
import { pcEditor, pcConfig, confirmAction, showToast } from '@/global';
import { useGlobalStore } from '@/hooks/useGlobalStore';
import { getFullLocalStorage, getLocalStorage, setLocalStorage } from '@/utils/storage';
import {
  createPCProjectDownloadJob,
  getPCJob,
  getPublishStatus,
  uploadStandalone,
} from '@/services/publish';
import useSSOHandle from '@/hooks/useSSOHandle';
import PublishModeSelect, { PUBLISH_MODE_KEYS, PublishModeType } from './PublishModeSelect';
import ChooseScenes from './ChooseScenes';
import ToolTips from '@/components/ToolTips';
import { usePublishStore } from '@/hooks/usePublishStore';
import useWorldAppStore from '@/hooks/useWorldAppStore';
import { validateProjectDataForStandalone } from '@/utils/validate';
import loadingScreenTemplate from '@/assets/loading-screen-template.js?raw';
import { VIVERSE_STUDIO_URL } from '@/config';
import { createNewWorld } from '@/services/create-world';
import useCreateWorldHandle from '@/hooks/useCreateWorldHandle';
import { Extension as ViverseExtension } from '@/Extension';

function durationBackoff(retryCount: number) {
  const maxDelay = 60000;
  const baseDelay = 1000;
  const factor = 1.6;
  const jitter = 0.2;

  if (retryCount === 0) {
    return baseDelay;
  }

  let backoff = baseDelay * Math.pow(factor, retryCount);
  backoff = Math.min(backoff, maxDelay);
  backoff *= 1 + jitter * (Math.random() * 2 - 1);

  return Math.max(backoff, 0);
}

// HACK: Override Playcanvas loading screen template
function overrideLoadingScreenSkeleton() {
  pcEditor.methodRemove('sourcefiles:loadingScreen:skeleton');
  pcEditor.method('sourcefiles:loadingScreen:skeleton', () => {
    return loadingScreenTemplate.trim();
  });
}

const updateHint = (
  setHint: React.Dispatch<React.SetStateAction<HintState>>,
  category: keyof HintState,
  message: string,
  className = '',
  icon = 'E129',
) => {
  const time = new Date().toLocaleString('en-GB');
  setHint((prev) => ({
    ...prev,
    [category]: {
      hint: `${time}: ${message}`,
      class: className,
      icon,
    },
  }));
};

type HintItem = {
  hint: string;
  class: string;
  icon: string;
};

type HintState = {
  download: HintItem;
  publish: HintItem;
  status: HintItem;
  preview: HintItem;
  downloadLogs: HintItem;
};

export default function PublishExtension() {
  const { login } = useGlobalStore((state) => state);
  const { handleUpdateForkWorld } = useCreateWorldHandle();
  const { toggleSSOLogin } = useSSOHandle();
  const [hint, setHint] = useState<HintState>({
    download: { hint: '', class: '', icon: '' },
    publish: { hint: '', class: '', icon: '' },
    status: { hint: '', class: '', icon: '' },
    preview: { hint: '', class: '', icon: '' },
    downloadLogs: { hint: '', class: '', icon: '' },
  });
  // const [job, setJob] = useState<PCJob>({ status: 'none' })
  const [pageStatus, setPageStatus] = useState({
    copiedAppId: false,
    createApp: false,
    downloaded: false,
    published: false,
    refreching: false,
    canPreview: false,
    notOwner: false,
  });
  const [appId, setAppId] = useState('');
  useEffect(() => {
    const unsubscribe = useWorldAppStore.subscribe(
      (state) => state.appId,
      (id) => {
        setAppId(id);
        setPageStatus((prev) => ({ ...prev, createApp: !!id }));
      },
    );
    return () => {
      unsubscribe();
    };
  }, []);
  const publishButton = useRef<HTMLButtonElement | null>(
    document.querySelector('#layout-toolbar .publish-download'),
  );
  const [publishButtonCount, setPublishButtonCount] = useState(0);
  const {
    accessToken,
    project,
    scene: { id: sceneId },
  } = pcConfig;
  const [publishMode, setPublishMode] = useState<PublishModeType>(PUBLISH_MODE_KEYS.STANDARD);
  const publishButtonKey = `PublishExtension_${publishMode}`;
  const { updateSceneType } = usePublishStore((state) => state);
  const { uploadState } = useWorldAppStore();
  const isUploading = uploadState === 'uploading';

  const onExtensionScriptsLoaded = useCallback(async () => {
    if (appId) {
      setPageStatus((prev) => ({
        ...prev,
        createApp: true,
      }));
      updateSceneType('standalone');
    }
  }, [appId, updateSceneType]);

  useEffect(() => {
    overrideLoadingScreenSkeleton();

    let previewState = false;
    if (getLocalStorage('latestTask' + sceneId)) {
      const latestJson = getLocalStorage('latestTask' + sceneId);
      if (latestJson) {
        try {
          const latest = JSON.parse(latestJson);
          if (latest && latest.time && latest.taskId) {
            setHint({
              ...hint,
              preview: {
                hint: `The latest version has been released on ${latest.time}. Task ID: ${latest.taskId}`,
                class: '',
                icon: 'E209',
              },
            });
            previewState = true;
          }
        } catch (error) {
          console.error('[Extension] Error parsing JSON:', error);
        }
      }
    }

    if (getLocalStorage('viversePublishedTaskId')) {
      const taskId = getLocalStorage('viversePublishedTaskId');
      const ssoToken = getLocalStorage('ssoToken');
      const checkStatus = async () => {
        if (ssoToken && taskId) {
          const { state, toast } = await getPublishStatus(ssoToken, taskId);

          const event = new Date(Date.now());
          const time = event.toLocaleString('en-GB');
          const prevState = taskId !== '' ? true : false;
          setPageStatus({
            ...pageStatus,
            downloaded: prevState,
            published: prevState,
            refreching: false,
            canPreview: previewState,
          });
          if (!state) {
            console.log('[Extension] previous task is no longer valid: ', taskId);
            setLocalStorage('viversePublishedTaskId', '');
            setLocalStorage('pcDownloadJobId', '');
            setPageStatus({
              ...pageStatus,
              canPreview: previewState,
            });
          } else {
            switch (state) {
              case '1': // doing
                setHint({
                  ...hint,
                  status: {
                    hint: `${time}: ${toast}`,
                    class: 'orange',
                    icon: 'E198',
                  },
                });
                setPageStatus({ ...pageStatus, refreching: true });
                break;

              case '2': // error
                setHint({
                  ...hint,
                  publish: {
                    hint: `${time}: ${toast}`,
                    class: 'red',
                    icon: 'E132',
                  },
                });
                setPageStatus({
                  ...pageStatus,
                  downloaded: false,
                  published: false,
                  refreching: false,
                });
                setLocalStorage('viversePublishedTaskId', '');
                setLocalStorage('pcDownloadJobId', '');
                break;

              case '3': // success
                setHint({
                  ...hint,
                  publish: {
                    hint: `${time}: ${toast}`,
                    class: 'green',
                    icon: 'E133',
                  },
                  preview: {
                    hint: `The latest version has been released on ${time}. Task ID: ${taskId}`,
                    class: '',
                    icon: 'E209',
                  },
                });
                setPageStatus({
                  ...pageStatus,
                  downloaded: false,
                  published: false,
                  refreching: false,
                  canPreview: true,
                });
                setLocalStorage('viversePublishedTaskId', '');
                setLocalStorage('pcDownloadJobId', '');
                setLocalStorage(
                  'latestTask' + sceneId,
                  JSON.stringify({ time: time, taskId: taskId }),
                );
                break;

              default:
                break;
            }
          }
        }
      };

      checkStatus().catch((error) => {
        console.log(error.message);
        setLocalStorage('viversePublishedTaskId', '');
        setLocalStorage('pcDownloadJobId', '');
      });
    } else {
      setPageStatus({
        ...pageStatus,
        canPreview: previewState,
      });
    }

    if (publishButton.current) {
      publishButton.current.onclick = () => {
        setPublishButtonCount((prev) => prev + 1);
      };
    } else {
      console.error('[Extension] Publish Button is not found.');
    }
  }, [sceneId]);

  useEffect(() => {
    pcEditor.once('extension-scripts:created', onExtensionScriptsLoaded);
    onExtensionScriptsLoaded();
  }, [onExtensionScriptsLoaded]);

  const onForkUpdateWorld = async () => {
    const ssoToken = getLocalStorage('ssoToken');
    if (!ssoToken) {
      // Add a delay to prevent login modal from being blocked by the confirm action
      setTimeout(() => {
        confirmAction(
          'Please log in to your VIVERSE account before updating the world.',
          toggleSSOLogin,
          {
            yesText: 'Login',
            noText: 'Cancel',
          },
        );
      }, 100);
      return;
    }
    let event = new Date(Date.now());
    let time = event.toLocaleString('en-GB');
    setHint((prev) => ({
      ...prev,
      publish: {
        hint: `${time}: Sending Update Forked World Request...`,
        class: '',
        icon: 'E222',
      },
    }));

    try {
      const validation = validateProjectDataForStandalone(project);
      if (!validation.isValid) {
        updateHint(
          setHint,
          'publish',
          validation.error?.message || 'Validation failed',
          'red',
          'E132',
        );
        return;
      }

      const result = await handleUpdateForkWorld();

      event = new Date(Date.now());
      time = event.toLocaleString('en-GB');

      if (result.success && result.appId) {
        useWorldAppStore.getState().updateAppId(result.appId);
        setHint((prev) => ({
          ...prev,
          publish: {
            hint: `${time}: App ID Updated Successfully. New ID: ${result.appId}`,
            class: 'green',
            icon: 'E133',
          },
        }));
        setPageStatus((prev) => ({ ...prev, createApp: true }));
      } else {
        setHint((prev) => ({
          ...prev,
          publish: {
            hint: `${time}: ${result.error || 'Update Failed.'}`,
            class: 'red',
            icon: 'E132',
          },
        }));
      }
    } catch (error) {
      console.error(error);
      setHint((prev) => ({
        ...prev,
        publish: {
          hint: `${time}: Update Failed, server or extension issue.`,
          class: 'red',
          icon: 'E132',
        },
      }));
    }
  };

  // Listen for fork-update-world event dispatched from Extension dialog
  useEffect(() => {
    pcEditor.on('viverse:fork-update-world', onForkUpdateWorld);
    return () => {
      pcEditor.off('viverse:fork-update-world', onForkUpdateWorld);
    };
  }, []);

  const handleDownload = async () => {
    const publishScenesIds = usePublishStore
      .getState()
      .scenes.filter((scene) => scene.selected)
      .map((scene) => scene.id.toString());

    try {
      const { status, id: jobId } = await createPCProjectDownloadJob(
        project?.id,
        project?.name,
        publishScenesIds,
        publishMode,
      );

      console.log('[Extension] Download Job', { status, jobId });

      // setJob({ status })
      setLocalStorage('pcDownloadJobId', jobId);
      const event = new Date(Date.now());
      const time = event.toLocaleString('en-GB');
      setHint({
        ...hint,
        download: {
          hint: `${time}: Download Job has Already Accepted`,
          class: 'green',
          icon: 'E133',
        },
      });
      setPageStatus({
        ...pageStatus,
        downloaded: true,
        published: false,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      handlePublish();
    } catch (error) {
      console.error('[Extension] Error: createPCProjectDownloadJob', error);
    }
  };

  const handleCreateNewWorld = async () => {
    const ssoToken = getLocalStorage('ssoToken');
    if (!ssoToken) {
      return;
    }
    let event = new Date(Date.now());
    let time = event.toLocaleString('en-GB');
    setHint((prev) => ({
      ...prev,
      publish: {
        hint: `${time}: Sending Create New World Request...`,
        class: '',
        icon: 'E222',
      },
    }));

    try {
      const validation = validateProjectDataForStandalone(project);
      if (!validation.isValid) {
        updateHint(
          setHint,
          'publish',
          validation.error?.message || 'Validation failed',
          'red',
          'E132',
        );
        return;
      }

      const title = project.name?.trim() || '';
      const description = project.description?.trim() || '';
      const result = await createNewWorld({
        ssoToken,
        title,
        description,
      });

      event = new Date(Date.now());
      time = event.toLocaleString('en-GB');

      if (result.success && result.appId) {
        useWorldAppStore.getState().updateAppId(result.appId);
        setHint((prev) => ({
          ...prev,
          publish: {
            hint: `${time}: Create New World App Successfully. App ID: ${result.appId}`,
            class: 'green',
            icon: 'E133',
          },
        }));
        setPageStatus((prev) => ({
          ...prev,
          createApp: true,
        }));
      } else {
        setHint((prev) => ({
          ...prev,
          publish: {
            hint: `${time}: ${
              result.error || 'Submission Failed, the server or your web extension have some issue.'
            }`,
            class: 'red',
            icon: 'E132',
          },
        }));
      }
    } catch (error) {
      console.error(error);
      setHint((prev) => ({
        ...prev,
        publish: {
          hint: `${time}: Submission Failed, the server or your web extension have some issue.`,
          class: 'red',
          icon: 'E132',
        },
      }));
    }
  };

  const handleUploadFlow = async (ssoToken: string, downloadUrl: string) => {
    if (appId) {
      updateSceneType('standalone');

      return await uploadStandalone(ssoToken, {
        scene_sid: appId,
        source: 'extension',
        file_url: downloadUrl,
      });
    } else {
      throw new Error('Failed to create standalone');
    }
  };

  const handlePublish = async (retryCount = 20) => {
    const jobID = getLocalStorage('pcDownloadJobId');
    let retryIndex = 0;
    while (retryCount > 0) {
      if (!jobID) {
        break; // break while
      }
      const {
        status,
        messages,
        data: { download_url: downloadUrl },
      } = await getPCJob(+jobID, accessToken);

      let event = new Date(Date.now());
      let time = event.toLocaleString('en-GB');
      if (status === 'error') {
        const errMessage = Array.isArray(messages) ? messages.join('; ') : messages;
        showToast(
          `Submission Failed: There’s an issue with the PlayCanvas server or your script.`,
          'error',
        );
        setHint({
          ...hint,
          publish: {
            hint: `${time}: Submission Failed: There’s an issue with the PlayCanvas server or your script. ${errMessage}`,
            class: 'red',
            icon: 'E132',
          },
        });
        setPageStatus({
          ...pageStatus,
          downloaded: false,
          published: false,
        });
        break;
      }
      if (status === 'complete') {
        const ssoToken = getLocalStorage('ssoToken');
        if (!ssoToken) {
          break; // break while
        }
        setHint({
          ...hint,
          publish: {
            hint: `${time}: Sending Publish Request...`,
            class: '',
            icon: 'E222',
          },
        });
        setPageStatus({
          ...pageStatus,
          downloaded: true,
          published: true,
          refreching: false,
        });
        try {
          const taskId = await handleUploadFlow(ssoToken, downloadUrl);

          event = new Date(Date.now());
          time = event.toLocaleString('en-GB');
          if (taskId) {
            handleGetStatus();
            setHint({
              ...hint,
              publish: {
                hint: `${time}: Start Publishing to VIVERSE! The Task ID is ${taskId}.`,
                class: 'green',
                icon: 'E133',
              },
            });
            setPageStatus({
              ...pageStatus,
              downloaded: true,
              published: true,
              canPreview: false,
            });
          } else {
            setHint({
              ...hint,
              publish: {
                hint: `${time}: Submission Failed, the server or your web extension have some issue.`,
                class: 'red',
                icon: 'E132',
              },
            });
            setPageStatus({
              ...pageStatus,
              downloaded: false,
              published: true,
            });
          }
          await new Promise((resolve) => setTimeout(resolve, durationBackoff(retryIndex)));
          break;
        } catch (error: any) {
          console.log(error);
          const errorMessage: string = error?.message || '';

          // Because API response 403 error message includes scene not found, content under review and not owner,
          // so we need to check the error message to determine the exact error.
          const isNotOwnerError = errorMessage.includes('neither owner nor the co-owner');

          if (isNotOwnerError) {
            // Project was forked — the appId belongs to the original owner
            ViverseExtension.getInstance().showForkUpdateDialog();
          }

          setHint({
            ...hint,
            publish: {
              hint: `${time}: ${errorMessage || 'Submission Failed, the server or your web extension have some issue.'}`,
              class: 'red',
              icon: 'E132',
            },
          });
          setPageStatus({ ...pageStatus, downloaded: false, published: true });
          break;
        }
      } else {
        event = new Date(Date.now());
        time = event.toLocaleString('en-GB');
        setHint({
          ...hint,
          publish: {
            hint: `${time}: The download process is still processing, please wait.`,
            class: '',
            icon: 'E218',
          },
        });
        setPageStatus({
          ...pageStatus,
          downloaded: true,
          published: false,
        });
        await new Promise((resolve) => setTimeout(resolve, durationBackoff(retryIndex)));
      }
      retryCount--;
      retryIndex++;
    }
    if (retryCount === 0) {
      showToast('Submission Failed, publish process timed out', 'error');
      setHint({
        ...hint,
        publish: {
          hint: `Submission Failed, please try again later.`,
          class: 'red',
          icon: 'E132',
        },
      });
      setPageStatus({
        ...pageStatus,
        downloaded: false,
        published: false,
      });
    }
  };

  const handleGetStatus = async (retryCount = 20) => {
    let retryIndex = 0;
    while (retryCount > 0) {
      const ssoToken = getLocalStorage('ssoToken');
      const taskId = getLocalStorage('viversePublishedTaskId');
      if (!ssoToken && !taskId) {
        break; // break while
      }
      let event = new Date(Date.now());
      let time = event.toLocaleString('en-GB');
      setHint({
        ...hint,
        status: {
          hint: `${time}: Tracking the Progress...`,
          class: '',
          icon: 'E129',
        },
      });
      setPageStatus({ ...pageStatus, refreching: true });
      try {
        const { state, toast } = await getPublishStatus(ssoToken, taskId);
        event = new Date(Date.now());
        time = event.toLocaleString('en-GB');
        switch (state) {
          case '1': // doing
            setHint({
              ...hint,
              status: {
                hint: `${time}: ${toast}`,
                class: 'orange',
                icon: 'E198',
              },
            });

            setPageStatus({ ...pageStatus, refreching: true });
            await new Promise((resolve) => setTimeout(resolve, durationBackoff(retryIndex)));
            break;
          case '2': // error
            setHint({
              ...hint,
              publish: { hint: `${time}: ${toast}`, class: 'red', icon: 'E132' },
            });
            setPageStatus({
              ...pageStatus,
              downloaded: false,
              published: false,
              refreching: false,
            });
            setLocalStorage('viversePublishedTaskId', '');
            setLocalStorage('pcDownloadJobId', '');
            retryCount = 0; // break while
            break;
          case '3': // success
            setHint({
              ...hint,
              publish: {
                hint: `${time}: ${toast}`,
                class: 'green',
                icon: 'E133',
              },
              preview: {
                hint: `The latest version has been released on ${time}. Task ID: ${taskId}`,
                class: '',
                icon: 'E209',
              },
            });
            setPageStatus({
              ...pageStatus,
              downloaded: false,
              published: false,
              refreching: false,
              canPreview: true,
            });
            setLocalStorage('viversePublishedTaskId', '');
            setLocalStorage('pcDownloadJobId', '');
            setLocalStorage('latestTask' + sceneId, JSON.stringify({ time: time, taskId: taskId }));
            retryCount = 0; // break while
            break;
          default:
            break;
        }
      } catch (error: any) {
        console.log('[Extension] Error: getPublishStatus', error.message);
        event = new Date(Date.now());
        time = event.toLocaleString('en-GB');
        setHint({
          ...hint,
          publish: {
            hint: `${time}: ${error.message}`,
            class: 'red',
            icon: 'E132',
          },
        });
        setPageStatus({
          ...pageStatus,
          downloaded: false,
          published: false,
          refreching: false,
        });
        setLocalStorage('viversePublishedTaskId', '');
        setLocalStorage('pcDownloadJobId', '');
        retryCount = 0; // break while
      }
      retryCount--;
      retryIndex++;
    }
  };

  const handleCopyAppId = async () => {
    if (!appId) return;

    try {
      await navigator.clipboard.writeText(appId);
      setPageStatus((prev) => ({ ...prev, copiedAppId: true }));
      showToast('App ID copied to clipboard', 'log', 2000);
      setTimeout(() => {
        setPageStatus((prev) => ({ ...prev, copiedAppId: false }));
      }, 2000);
    } catch (error) {
      console.error('[PublishExtension] Failed to copy App ID:', error);
      updateHint(setHint, 'publish', 'Failed to copy App ID', 'red', 'E132');
    }
  };

  const updatePreviewHint = (message: string, className = '', icon = 'E129') => {
    updateHint(setHint, 'preview', message, className, icon);
  };

  const getLatestTaskInfo = (): { taskId?: string; time?: string } | null => {
    try {
      const latestJson = getLocalStorage('latestTask' + sceneId);
      return latestJson ? JSON.parse(latestJson) : null;
    } catch (error) {
      console.error('[PublishExtension] Failed to parse latest task info:', error);
      return null;
    }
  };

  const handlePreview = async () => {
    try {
      const ssoToken = getLocalStorage('ssoToken');
      if (!ssoToken) {
        updatePreviewHint('Authentication required', 'red', 'E132');
        return;
      }

      updatePreviewHint('Getting scene...');

      const { sceneType } = usePublishStore.getState();

      if (sceneType === 'standalone') {
        const previewUrl = useWorldAppStore.getState().previewUrl;
        if (!previewUrl) {
          throw new Error('Preview URL not found for standalone scene');
        }

        const latestTask = getLatestTaskInfo();
        if (latestTask?.taskId && latestTask?.time) {
          setHint((prev) => ({
            ...prev,
            preview: {
              hint: `The latest version has been released on ${latestTask.time}. Task ID: ${latestTask.taskId}`,
              class: '',
              icon: 'E209',
            },
          }));
        }

        window.open(previewUrl, '_blank');
      } else {
        throw new Error(`Unsupported scene type: ${sceneType}`);
      }
    } catch (error) {
      console.error('[PublishExtension] Preview failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch scene preview';
      updatePreviewHint(errorMessage, 'red', 'E132');
    }
  };

  const downloadLogs = async () => {
    // get extension version from manifest
    const version = localStorage.getItem('extension-version');
    const currentPageUrl = window.location.href;
    const pcPublishItem = getFullLocalStorage();
    const creatorProfile = localStorage.getItem('viverse-profile');

    const logs = JSON.parse(localStorage.getItem('viverse-logs') || '[]');
    const logsText = `
  Extension Version: ${version}

  Current Page URL: ${currentPageUrl}

  Timestamp: ${new Date().toISOString()} 

  Creator Profile: 
    ${creatorProfile}

  PC Publish Item: 
    ${pcPublishItem}

  API Logs:
    ${logs
      .map((log: any) => {
        const { request, response } = log;
        return `
    Request:
    [${request.method}] ${request.url}
    Headers: ${JSON.stringify(request.headers, null, 2)}
    Body: ${request.body || 'N/A'}
    
    Response (${response.status}):
    Headers: ${response.headers}
    Body: ${response.body || 'N/A'}
    `;
      })
      .join('\n---------\n')}
    `;

    // Create a Blob from the logs text
    const blob = new Blob([logsText], { type: 'text/plain' });

    // Create a link element
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `publish_logs_${new Date().toISOString()}.txt`; // Filename with current timestamp

    // Append the link to the body, trigger click to download, and then remove the link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Optional: Revoke the object URL after the download
    URL.revokeObjectURL(url);
    setHint({
      ...hint,
      downloadLogs: {
        hint: `API logs downloaded successfully!`,
        class: '',
        icon: 'E209',
      },
    });
  };

  return (
    <>
      <Panel
        id="publishExtension"
        headerText="Download Remotely & Publish to VIVERSE"
        collapsible={false}
        collapsed={true}
      >
        {/* Download */}

        <Container class="oneline" flexDirection="column" alignItems="start">
          {login ? (
            <>
              <ChooseScenes updateCount={publishButtonCount} />
              <Container class="oneline">
                <PublishModeSelect publishMode={publishMode} setPublishMode={setPublishMode} />
              </Container>

              {appId && (
                <Container class="oneline" flexDirection="row" alignItems="center">
                  <Label text={`App ID: ${appId}`} class={['ui-label', 'label']} />
                  {pageStatus.copiedAppId ? (
                    <Label text="Copied!" class={['ui-label', 'label']} />
                  ) : (
                    <ToolTips
                      data={{
                        type: 'simple',
                        text: 'Copy App ID',
                      }}
                    >
                      <button
                        className={'tooltip-button pcui-button'}
                        data-icon={String.fromCodePoint(parseInt('E126', 16))}
                        onClick={handleCopyAppId}
                      />
                    </ToolTips>
                  )}
                </Container>
              )}

              <div className="customPublishWrapper">
                {pageStatus.createApp ? (
                  <>
                    <Button
                      key={publishButtonKey + '_upload'}
                      icon="E222"
                      class="button"
                      text="Upload to VIVERSE"
                      enabled={
                        !isUploading &&
                        !pageStatus.downloaded &&
                        !pageStatus.published &&
                        !pageStatus.refreching &&
                        !pageStatus.notOwner
                      }
                      onClick={handleDownload}
                    />
                    <ToolTips
                      data={{
                        type: 'complex',
                        title: 'Upload to VIVERSE',
                        text: 'Upload your World to VIVERSE Studio, where you can manage it and submit it for review to publish.',
                        button: {
                          label: 'Go to VIVERSE Studio',
                          onClick: () => {
                            window.open(`${VIVERSE_STUDIO_URL}/upload`, '_blank');
                          },
                        },
                      }}
                    >
                      <button
                        className={'tooltip-button pcui-button'}
                        data-icon={String.fromCodePoint(parseInt('E400', 16))}
                      />
                    </ToolTips>
                  </>
                ) : (
                  <>
                    <Button
                      key={publishButtonKey + '_create'}
                      icon="E287"
                      class="button"
                      text="Create New World"
                      enabled={true}
                      onClick={handleCreateNewWorld}
                    />
                    <ToolTips
                      data={{
                        type: 'complex',
                        title: 'Create New World',
                        text: 'After clicking it, an App ID will be assigned. This ID uniquely identifies your World and is required for VIVERSE SDK integration. And your project will include the VIVERSE loading screen, shown to users before entering your World. The VIVERSE PlayCanvas Toolkit will also be imported, allowing you to customize the experience. For more details, see the Documentation.',
                        button: {
                          label: 'View Documentation',
                          onClick: () => {
                            window.open('https://docs.viverse.com', '_blank');
                          },
                        },
                      }}
                    >
                      <button
                        className={'tooltip-button pcui-button'}
                        data-icon={String.fromCodePoint(parseInt('E400', 16))}
                      />
                    </ToolTips>
                  </>
                )}
              </div>

              {hint.download.hint !== '' && (
                <InfoBox
                  id="hint"
                  class={hint.download.class}
                  icon={hint.download.icon}
                  title={hint.download.hint}
                ></InfoBox>
              )}
              {hint.publish.hint !== '' && (
                <InfoBox
                  id="hint"
                  class={hint.publish.class}
                  icon={hint.publish.icon}
                  title={hint.publish.hint}
                ></InfoBox>
              )}
              {hint.status.hint !== '' && (
                <InfoBox
                  id="hint"
                  class={hint.status.class}
                  icon={hint.status.icon}
                  title={hint.status.hint}
                ></InfoBox>
              )}
            </>
          ) : (
            <Button
              icon="E222"
              text={'Upload to VIVERSE'}
              class="button"
              onClick={() =>
                confirmAction(
                  'Please log in to your VIVERSE account before uploading to VIVERSE.',
                  toggleSSOLogin,
                  {
                    yesText: 'Login',
                    noText: 'Cancel',
                  },
                )
              }
            />
          )}
        </Container>

        {pageStatus.createApp &&
          pageStatus.canPreview &&
          !pageStatus.downloaded &&
          !pageStatus.published &&
          !pageStatus.refreching && (
            <Container class="oneline">
              <Button
                icon="E117"
                class="button"
                enabled={pageStatus.canPreview}
                onClick={handlePreview}
                text="Preview"
              />
              <InfoBox
                id="hint"
                class={hint.preview.class}
                icon={hint.preview.icon}
                title={hint.preview.hint}
              ></InfoBox>
            </Container>
          )}
        <Container class="oneline">
          <Button
            icon="E119"
            class="button"
            enabled={true}
            onClick={downloadLogs}
            text="Download Logs"
          />
          <InfoBox
            id="hint"
            class={hint.downloadLogs.class}
            icon={hint.downloadLogs.icon}
            title={hint.downloadLogs.hint}
          ></InfoBox>
        </Container>
      </Panel>
    </>
  );
}
