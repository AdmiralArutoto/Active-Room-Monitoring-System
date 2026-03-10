export default function PageTitle({ children, style }) {
  return (
    <h1 className="page-title" style={style}>
      {children}
    </h1>
  );
}
