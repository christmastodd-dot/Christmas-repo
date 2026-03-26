"use client";

export interface BillField {
  number: string;
  hint: string;
  summary?: string;
}

interface Props {
  bills: BillField[];
  onChange: (bills: BillField[]) => void;
}

export default function BillFieldset({ bills, onChange }: Props) {
  function updateBill(index: number, field: keyof BillField, value: string) {
    const updated = bills.map((b, i) =>
      i === index ? { ...b, [field]: value } : b
    );
    onChange(updated);
  }

  function addBill() {
    if (bills.length >= 4) return;
    onChange([...bills, { number: "", hint: "" }]);
  }

  function removeBill(index: number) {
    if (bills.length <= 2) return;
    onChange(bills.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-navy">
          Bills (2–4)
        </label>
        {bills.length < 4 && (
          <button
            type="button"
            onClick={addBill}
            className="text-sm text-navy underline hover:text-blue-800"
          >
            + Add bill
          </button>
        )}
      </div>

      {bills.map((bill, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-36">
            <input
              type="text"
              placeholder="e.g. HB1841 HD1"
              value={bill.number}
              onChange={(e) => updateBill(i, "number", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="One-line topic hint"
              value={bill.hint}
              onChange={(e) => updateBill(i, "hint", e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
            />
          </div>
          {bill.summary !== undefined && (
            <div className="flex-1">
              <textarea
                placeholder="Generated summary"
                value={bill.summary}
                onChange={(e) => updateBill(i, "summary", e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>
          )}
          {bills.length > 2 && (
            <button
              type="button"
              onClick={() => removeBill(i)}
              className="text-red-500 hover:text-red-700 text-sm mt-2"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
