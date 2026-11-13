type Option<T> = { value: T; label: string; disabled?: boolean };
export function SegmentedControl<T extends string>({ value, options, label, onChange }: { value: T; options: Option<T>[]; label: string; onChange(value: T): void }) {
  const index = options.findIndex(option => option.value === value);
  return <div className="view-toggle" role="group" aria-label={label} data-mode={value}>
    <span className="view-toggle-glider" aria-hidden="true" style={{ transform: `translateX(${index * 100}%)` }} />
    {options.map(option => <button key={option.value} type="button" disabled={option.disabled} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}
