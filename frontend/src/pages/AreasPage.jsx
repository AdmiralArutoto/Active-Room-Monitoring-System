import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';

export default function AreasPage() {
  return (
    <div>
      <PageTitle>Areas</PageTitle>
      <Card>
        <EmptyState
          title="Area management is not implemented in this UI pass"
          description="Use Dashboard controls to create and organize buildings, floors, and rooms."
        />
      </Card>
    </div>
  );
}
