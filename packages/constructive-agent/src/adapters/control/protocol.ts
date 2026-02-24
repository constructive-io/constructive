import type { ApprovalRequestRecord } from '../../types/approval';
import type { ConstructiveAgentRunConfig } from '../../types/config';
import type { AgentRunEvent } from '../../types/events';
import type { AgentRunRecord } from '../../types/run-state';
import type {
  AgentRunner,
  DecideApprovalOptions,
  StartRunOptions,
} from '../../runtime/create-agent-runner';
import type { WebBridgeSubscriber } from '../web/bridge';

export type AgentControlCommand =
  | {
      type: 'start_run';
      payload: {
        config: ConstructiveAgentRunConfig;
        options?: StartRunOptions;
      };
    }
  | {
      type: 'resume_run';
      payload: {
        runId: string;
        signal?: AbortSignal;
      };
    }
  | {
      type: 'abort_run';
      payload: {
        runId: string;
        reason?: string;
      };
    }
  | {
      type: 'approve_pending';
      payload: {
        runId: string;
        options: DecideApprovalOptions;
      };
    }
  | {
      type: 'reject_pending';
      payload: {
        runId: string;
        options: Omit<DecideApprovalOptions, 'autoResume'>;
      };
    }
  | {
      type: 'list_approvals';
      payload: {
        runId: string;
      };
    }
  | {
      type: 'get_run';
      payload: {
        runId: string;
      };
    }
  | {
      type: 'get_events';
      payload: {
        runId: string;
      };
    };

export type AgentControlResult =
  | AgentRunRecord
  | AgentRunRecord[]
  | ApprovalRequestRecord[]
  | AgentRunEvent[]
  | null;

export type AgentControlResponse<TData = AgentControlResult> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

export class InMemoryAgentControlProtocol {
  constructor(
    private readonly runner: AgentRunner,
    private readonly subscriber?: Pick<WebBridgeSubscriber, 'subscribe' | 'subscribeAll'>,
  ) {}

  async execute(
    command: AgentControlCommand,
  ): Promise<AgentControlResponse> {
    try {
      switch (command.type) {
        case 'start_run': {
          return {
            ok: true,
            data: await this.runner.startRun(
              command.payload.config,
              command.payload.options,
            ),
          };
        }

        case 'resume_run': {
          return {
            ok: true,
            data: await this.runner.resumeRun(command.payload.runId, {
              signal: command.payload.signal,
            }),
          };
        }

        case 'abort_run': {
          return {
            ok: true,
            data: await this.runner.abortRun(command.payload.runId, {
              reason: command.payload.reason,
            }),
          };
        }

        case 'approve_pending': {
          return {
            ok: true,
            data: await this.runner.approvePending(
              command.payload.runId,
              command.payload.options,
            ),
          };
        }

        case 'reject_pending': {
          return {
            ok: true,
            data: await this.runner.rejectPending(
              command.payload.runId,
              command.payload.options,
            ),
          };
        }

        case 'list_approvals': {
          return {
            ok: true,
            data: await this.runner.listApprovals(command.payload.runId),
          };
        }

        case 'get_run': {
          return {
            ok: true,
            data: await this.runner.getRun(command.payload.runId),
          };
        }

        case 'get_events': {
          return {
            ok: true,
            data: await this.runner.getEvents(command.payload.runId),
          };
        }
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  subscribe(
    runId: string,
    onEvent: (event: AgentRunEvent) => void,
  ): () => void {
    if (!this.subscriber) {
      throw new Error('No event subscriber configured for control protocol');
    }

    return this.subscriber.subscribe(runId, onEvent);
  }

  subscribeAll(onEvent: (event: AgentRunEvent) => void): () => void {
    if (!this.subscriber) {
      throw new Error('No event subscriber configured for control protocol');
    }

    return this.subscriber.subscribeAll(onEvent);
  }
}
