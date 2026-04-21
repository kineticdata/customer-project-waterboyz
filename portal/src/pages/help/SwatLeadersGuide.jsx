// portal/src/pages/help/SwatLeadersGuide.jsx
import { HelpLayout } from './HelpLayout.jsx';
import Content, { sections } from './generated/swat-leaders.jsx';

export function SwatLeadersGuide() {
  return (
    <HelpLayout title="SWAT Leadership Guide" sections={sections}>
      <Content />
    </HelpLayout>
  );
}
