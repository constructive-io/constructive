import type { ExtensionFactory } from '@earendil-works/pi-coding-agent';
import { type Static, Type } from 'typebox';

const StepStatus = Type.Union([
  Type.Literal('pending'),
  Type.Literal('in_progress'),
  Type.Literal('done'),
]);

const CreatePlanSchema = Type.Object({
  steps: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
});

const UpdateStepSchema = Type.Object({
  step: Type.Integer({ minimum: 1 }),
  status: StepStatus,
});

type CreatePlanParams = Static<typeof CreatePlanSchema>;
type UpdateStepParams = Static<typeof UpdateStepSchema>;

const PLAN_GUIDELINES = [
  'When a request needs several steps, call create_plan first to lay out the ordered steps, then call update_plan_step as you go — mark a step in_progress when you start it and done when it finishes.',
  'Keep exactly one step in_progress at a time. Call clear_plan if you abandon a plan. Skip planning entirely for trivial one-shot turns.',
];

export const planTools: ExtensionFactory = (pi) => {
  // The current ordered steps, held per session (each chat gets its own loader →
  // its own factory invocation). update_plan_step reads this to enrich its result
  // with the step's title and the plan total, so the inline card can render
  // `index/total title` without cross-referencing the transcript.
  let currentSteps: string[] = [];

  pi.registerTool({
    name: 'create_plan',
    label: 'Plan',
    description:
      'Lay out an ordered list of steps for the current run, shown to the user as a live progress tracker. Call once when a request warrants multiple steps; calling again replaces the plan. Steps are referenced by 1-based number in update_plan_step.',
    promptSnippet: 'create_plan: lay out the ordered steps for a multi-step run.',
    promptGuidelines: PLAN_GUIDELINES,
    parameters: CreatePlanSchema,
    async execute(_toolCallId, params: CreatePlanParams) {
      currentSteps = params.steps;
      const text = params.steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
      return {
        content: [{ type: 'text', text: `Plan created:\n${text}` }],
        details: { steps: params.steps },
      };
    },
  });

  pi.registerTool({
    name: 'update_plan_step',
    label: 'Update plan',
    description:
      'Update the status of one plan step by its 1-based number (pending, in_progress, or done). Use as you progress through the plan created with create_plan.',
    promptSnippet: 'update_plan_step: mark a plan step in_progress or done as you work.',
    parameters: UpdateStepSchema,
    async execute(_toolCallId, params: UpdateStepParams) {
      const label = currentSteps[params.step - 1];
      const total = currentSteps.length;
      return {
        content: [{ type: 'text', text: `Step ${params.step} → ${params.status}` }],
        details: {
          step: params.step,
          status: params.status,
          ...(label ? { label, total } : {}),
        },
      };
    },
  });

  pi.registerTool({
    name: 'clear_plan',
    label: 'Clear plan',
    description:
      'Remove the current plan entirely, hiding the progress tracker. Use when a plan is abandoned or no longer relevant.',
    promptSnippet: 'clear_plan: drop the current plan when it no longer applies.',
    parameters: Type.Object({}),
    async execute() {
      currentSteps = [];
      return { content: [{ type: 'text', text: 'Plan cleared.' }], details: { cleared: true } };
    },
  });
};

export default planTools;
