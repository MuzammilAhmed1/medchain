export function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto border border-border rounded-md">
      <table className="w-full text-left border-collapse">
        <thead className="bg-canvas">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="text-label text-ink-muted px-4 py-3 border-b border-border whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-border last:border-0 ${onClick ? "cursor-pointer hover:bg-canvas" : ""}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, mono = false, className = "" }) {
  return (
    <td
      className={`px-4 py-3 text-body text-ink h-12 ${mono ? "font-mono text-small" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-16 px-6">
      <h3 className="text-h3 text-ink">{title}</h3>
      {description && <p className="text-small text-ink-muted max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
