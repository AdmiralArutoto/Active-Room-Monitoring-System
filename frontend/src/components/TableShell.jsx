import Card from './Card';

export default function TableShell({ children, className = '', style }) {
  return (
    <Card className={className} style={style}>
      <div className="table-shell">{children}</div>
    </Card>
  );
}
