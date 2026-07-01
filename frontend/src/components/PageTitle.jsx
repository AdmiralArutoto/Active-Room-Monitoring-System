import { useEffect } from 'react';

export default function PageTitle({ children, style }) {
  // Keep the browser tab title in sync with the current page.
  useEffect(() => {
    if (typeof children === 'string') document.title = `${children} · HallSense`;
  }, [children]);

  return (
    <h1 className="page-title" style={style}>
      {children}
    </h1>
  );
}
