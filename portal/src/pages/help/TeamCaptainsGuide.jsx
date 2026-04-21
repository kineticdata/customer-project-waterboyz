// portal/src/pages/help/TeamCaptainsGuide.jsx
import { HelpLayout } from './HelpLayout.jsx';
import Content, { sections } from './generated/team-captains.jsx';

export function TeamCaptainsGuide() {
  return (
    <HelpLayout title="Team Captain Guide" sections={sections}>
      <Content />
    </HelpLayout>
  );
}
