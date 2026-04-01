import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { SaleDetail } from '../types/inventory.types';

interface ReturnsPanelProps {
  saleLookupId: string;
  setSaleLookupId: (value: string) => void;
  loadedSale: SaleDetail | null;
  returnReason: string;
  setReturnReason: (value: string) => void;
  returnQuantities: Record<string, string>;
  setReturnQuantities: Dispatch<SetStateAction<Record<string, string>>>;
  isBusy: boolean;
  onLoadSale: () => Promise<void>;
  onSubmitReturn: () => Promise<void>;
}

export function ReturnsPanel({
  saleLookupId,
  setSaleLookupId,
  loadedSale,
  returnReason,
  setReturnReason,
  returnQuantities,
  setReturnQuantities,
  isBusy,
  onLoadSale,
  onSubmitReturn,
}: ReturnsPanelProps) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmitReturn();
  }

  return (
    <div className="inventory-panel">
      <div className="panel-heading">
        <div>
          <p className="inventory-eyebrow">Returns</p>
          <h2>Load a sale and return safely</h2>
        </div>
      </div>
      <div className="inventory-inline-fields">
        <div className="form-group">
          <label htmlFor="sale-lookup">Sale ID</label>
          <input
            id="sale-lookup"
            value={saleLookupId}
            onChange={(event) => setSaleLookupId(event.target.value)}
            placeholder="Paste a sale UUID"
          />
        </div>
        <button
          className="btn-secondary inventory-lookup-button"
          type="button"
          onClick={() => void onLoadSale()}
        >
          Load sale
        </button>
      </div>
      {loadedSale ? (
        <form onSubmit={(event) => void submit(event)}>
          <div className="form-group">
            <label htmlFor="return-reason">Reason</label>
            <input
              id="return-reason"
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
              placeholder="Optional reason"
            />
          </div>
          <div className="return-list">
            {loadedSale.items.map((item) => (
              <div className="return-row" key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  <p>
                    Sold {item.quantity} • returned {item.returnedQuantity} • remaining{' '}
                    {item.remainingReturnable}
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  max={item.remainingReturnable}
                  value={returnQuantities[item.id] ?? ''}
                  onChange={(event) =>
                    setReturnQuantities((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <button className="btn-primary" type="submit" disabled={isBusy}>
            Process return
          </button>
        </form>
      ) : (
        <p className="inventory-empty">
          Load a sale to see returnable quantities and batch allocations.
        </p>
      )}
    </div>
  );
}
