import { useRef, type KeyboardEvent, type ReactElement } from 'react';

export interface TabDef<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: readonly TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}

export const tabId = (id: string): string => `tab-${id}`;
export const panelId = (id: string): string => `panel-${id}`;

/** WAI-ARIA tabs: arrow keys move between tabs, Home/End jump to the ends, focus follows selection. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: Readonly<TabsProps<T>>): ReactElement {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  const select = (index: number) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    if (!tab) return;
    onChange(tab.id);
    refs.current.get(tab.id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target);
  };

  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(node) => {
            if (node) refs.current.set(tab.id, node);
            else refs.current.delete(tab.id);
          }}
          type="button"
          role="tab"
          id={tabId(tab.id)}
          aria-selected={tab.id === active}
          aria-controls={panelId(tab.id)}
          tabIndex={tab.id === active ? 0 : -1}
          className="tab"
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
