/**
 * `@agentic-kit/pi-ext-gate` — gate a pi session's tool calls through a declared
 * policy, deferring anything the policy will not decide alone to an approval
 * channel that can reach a human on another machine.
 */

export {
  type ApprovalChannel,
  type ApprovalOutcome,
  type ApprovalRequest,
  pollingApprovalChannel,
  type PollingApprovalChannelOptions,
  staticApprovalChannel
} from './approval';
export {
  createGateExtension,
  type GateDecisionRecord,
  type GateExtension,
  type GateExtensionOptions
} from './extension';
export {
  type GateDecision,
  GatePolicy,
  gatePolicy,
  type GatePolicyOptions,
  type GateRequest,
  type GateRule,
  type GateVerdict
} from './policy';
