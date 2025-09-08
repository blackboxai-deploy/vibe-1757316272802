import React from 'react';
import { ViewName } from '../../types.ts';

interface BreadcrumbItem {
  label: string;
  view: ViewName;
  isActive: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onItemClick: (view: ViewName) => void;
  className?: string;
  separator?: React.ReactNode;
  maxItems?: number;
  showHome?: boolean;
  homeLabel?: string;
}

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={`w-4 h-4 ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const HomeIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={`w-4 h-4 ${className}`}
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  onItemClick,
  className = '',
  separator,
  maxItems = 4,
  showHome = true,
  homeLabel = 'Home',
}) => {
  // Process items to handle overflow
  let displayItems = [...items];
  let showEllipsis = false;

  if (displayItems.length > maxItems && maxItems > 2) {
    // Keep first item, add ellipsis, then show last (maxItems - 2) items
    const keepLast = maxItems - 2;
    displayItems = [
      displayItems[0],
      ...displayItems.slice(-keepLast),
    ];
    showEllipsis = true;
  }

  const defaultSeparator = <ChevronRightIcon className="text-brand-text-secondary-light dark:text-brand-text-secondary" />;

  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {showHome && displayItems.length > 0 && displayItems[0]?.view !== ViewName.Dashboard && (
          <>
            <li>
              <button
                type="button"
                onClick={() => onItemClick(ViewName.Dashboard)}
                className="flex items-center text-brand-text-secondary-light dark:text-brand-text-secondary hover:text-brand-green dark:hover:text-brand-dark-green-text transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-green dark:focus:ring-brand-dark-green rounded-md p-1"
                aria-label={`Navigate to ${homeLabel}`}
              >
                <HomeIcon className="mr-1" />
                <span className="sr-only">{homeLabel}</span>
              </button>
            </li>
            <li className="flex items-center">
              {separator || defaultSeparator}
            </li>
          </>
        )}

        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isFirst = index === 0;

          return (
            <React.Fragment key={`${item.view}-${index}`}>
              {/* Show ellipsis after first item if needed */}
              {showEllipsis && isFirst && displayItems.length > 2 && (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => onItemClick(item.view)}
                      className={`
                        text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-green dark:focus:ring-brand-dark-green rounded-md px-2 py-1
                        ${item.isActive 
                          ? 'text-brand-text-light dark:text-brand-text cursor-default' 
                          : 'text-brand-text-secondary-light dark:text-brand-text-secondary hover:text-brand-green dark:hover:text-brand-dark-green-text'
                        }
                      `}
                      disabled={item.isActive}
                      aria-current={item.isActive ? 'page' : undefined}
                    >
                      {item.label}
                    </button>
                  </li>
                  <li className="flex items-center">
                    {separator || defaultSeparator}
                  </li>
                  <li className="flex items-center">
                    <span className="text-brand-text-secondary-light dark:text-brand-text-secondary">
                      ...
                    </span>
                  </li>
                  <li className="flex items-center">
                    {separator || defaultSeparator}
                  </li>
                </>
              )}

              {/* Regular breadcrumb item */}
              {(!showEllipsis || !isFirst || displayItems.length <= 2) && (
                <li>
                  <button
                    type="button"
                    onClick={() => onItemClick(item.view)}
                    className={`
                      text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-green dark:focus:ring-brand-dark-green rounded-md px-2 py-1
                      ${item.isActive 
                        ? 'text-brand-text-light dark:text-brand-text cursor-default' 
                        : 'text-brand-text-secondary-light dark:text-brand-text-secondary hover:text-brand-green dark:hover:text-brand-dark-green-text'
                      }
                    `}
                    disabled={item.isActive}
                    aria-current={item.isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </button>
                </li>
              )}

              {/* Separator (except for last item) */}
              {!isLast && (
                <li className="flex items-center">
                  {separator || defaultSeparator}
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;