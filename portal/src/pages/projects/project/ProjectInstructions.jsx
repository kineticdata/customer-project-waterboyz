import { Icon } from '../../../atoms/Icon.jsx';

const steps = [
  {
    icon: 'phone-call',
    title: 'Reach out to the family',
    description:
      'Introduce yourself as the Project Captain. Let them know you will be their main point of contact throughout the project.',
  },
  {
    icon: 'clipboard-check',
    title: 'Schedule a project review',
    description:
      'Set up a time to visit the project site and review the scope of work with the family. Assess the needs in person so you can plan materials, skills, and volunteer count.',
  },
  {
    icon: 'message-check',
    title: 'Communicate the project scope',
    description:
      'Clearly explain what work will and will not be done so there are no surprises on serve day. Once this conversation is complete, mark the "Family Communication Complete" checkbox on the Details tab.',
  },
  {
    icon: 'notes',
    title: 'Update project notes',
    description:
      'After each communication with the family, add a note on the Notes tab with the date and details of the conversation. This lets SWAT Leadership stay up to date and know the family has been contacted.',
  },
];

export const ProjectInstructions = () => {
  return (
    <div className="krounded-box border kbg-base-100 p-6">
      <div className="flex-sc gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex-cc shrink-0">
          <Icon name="list-check" size={20} className="text-primary" />
        </div>
        <div>
          <div className="text-lg font-semibold">Captain Instructions</div>
          <p className="text-sm text-base-content/60">
            Follow these steps for every project you lead.
          </p>
        </div>
      </div>

      <ol className="mt-6 space-y-6">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex-cc shrink-0 text-primary font-bold text-sm">
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-base-300 mt-2" />
              )}
            </div>
            <div className="pb-2">
              <div className="flex-sc gap-2 font-semibold">
                <Icon name={step.icon} size={18} className="text-primary" />
                {step.title}
              </div>
              <p className="mt-1 text-sm text-base-content/70 leading-relaxed">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-lg bg-warning/10 border border-warning/20 p-4">
        <div className="flex gap-3">
          <Icon
            name="alert-triangle"
            size={20}
            className="text-warning shrink-0 mt-0.5"
          />
          <div className="text-sm">
            <p className="font-semibold text-warning-content">Important</p>
            <p className="mt-1 text-base-content/70 leading-relaxed">
              Family communication should be completed at least 4 weeks before
              the scheduled project date. SWAT Leadership monitors the
              &ldquo;Family Communication Complete&rdquo; status across all
              projects and will follow
              up if it hasn&apos;t been marked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
