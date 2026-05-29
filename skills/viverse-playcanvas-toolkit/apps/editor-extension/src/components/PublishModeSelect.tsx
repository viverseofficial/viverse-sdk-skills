import useTooltip from '@/hooks/useTooltip';
import { Container, Label, SelectInput } from '@playcanvas/pcui/react';
import { FloatingArrow } from '@floating-ui/react';

export type PublishModeType = 'standard' | 'debug';
export const PUBLISH_MODE_KEYS: { [key: string]: PublishModeType } = {
  STANDARD: 'standard',
  DEBUG: 'debug',
};

const publishModeOptions = [
  { v: PUBLISH_MODE_KEYS.STANDARD, t: 'Standard' },
  { v: PUBLISH_MODE_KEYS.DEBUG, t: 'Debug' },
];

function PublishModeSelect({
  publishMode,
  setPublishMode,
}: {
  publishMode: string;
  setPublishMode: (mode: PublishModeType) => void;
}) {
  const {
    arrowRef,
    tooltipOpen,
    tooltipRefs,
    tooltipContext,
    tooltipFloatingStyles,
    getTooltipReferenceProps,
    getTooltipFloatingProps,
  } = useTooltip();

  const handleChangePublishMode = (value: string) => {
    setPublishMode(value as PublishModeType);
  };

  return (
    <>
      <div className="label-input">
        <div ref={tooltipRefs.setReference} {...getTooltipReferenceProps()}>
          <Label text="Publishing Mode" />
        </div>
        <SelectInput
          allowInput
          options={publishModeOptions}
          onChange={handleChangePublishMode}
          value={publishMode}
        />
      </div>

      {tooltipOpen && (
        <div
          className="tooltip"
          ref={tooltipRefs.setFloating}
          style={tooltipFloatingStyles}
          {...getTooltipFloatingProps()}
        >
          <Container width={400} flex={true} flexDirection="column">
            <p>
              Debug mode is designed to assist in development and debugging processes, whereas
              Standard mode delivers an optimized build intended for distribution.
            </p>
          </Container>
          <FloatingArrow ref={arrowRef} context={tooltipContext} fill="#181f20" />
        </div>
      )}
    </>
  );
}

export default PublishModeSelect;
