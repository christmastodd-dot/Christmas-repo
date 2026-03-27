"use client";

export interface BillField {
  number: string;
  summary: string;
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
    onChange([...bills, { number: "", summary: "" }]);
  }

  function removeBill(index: number) {
    if (bills.length <= 2) return;
    onChange(bills.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-800 tracking-wide uppercase">
          Bills ({bills.length}/4)
        </label>
        {bills.length < 4 && (
          <button
            type="button"
            onClick={addBill}
            className="text-xs font-semibold text-navy bg-blue-50 border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-100 transition-colors"
          >
            + Add bill
          </button>
        )}
      </div>

      <div className="space-y-3">
        {bills.map((bill, i) => (
          <div
            key={i}
            className="group relative bg-gray-50 border border-gray-200 rounded-xl p-4 transition-all hover:border-navy/30 hover:shadow-sm"
          >
            {bills.length > 2 && (
              <button
                type="button"
                onClick={() => removeBill(i)}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
              >
                x
              </button>
            )}
            <div className="flex gap-3 items-center mb-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-navy/10 text-navy text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <input
                type="text"
                placeholder="Bill number (e.g. HB1841 HD1)"
                value={bill.number}
                onChange={(e) => updateBill(i, "number", e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/50 transition"
              />
            </div>
            <textarea
              placeholder="Write the bill summary as it should appear on the postcard..."
              value={bill.summary}
              onChange={(e) => updateBill(i, "summary", e.target.value)}
              rows={2}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/50 transition resize-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
