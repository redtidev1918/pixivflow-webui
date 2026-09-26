import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** Localised page title. */
  title: ReactNode;
  /** Optional one-line explanation of what the page is for. */
  description?: ReactNode;
  /** Primary/secondary actions, right-aligned. */
  actions?: ReactNode;
}

/**
 * Standard page header: title, optional description, optional actions.
 *
 * Every page shares this so the first thing a user sees is identical in shape
 * and spacing across the app.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        <h2>{title}</h2>
        {description ? <div className="page-header-description">{description}</div> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
