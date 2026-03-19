import type { Budget } from '../../types';
import { CostBreakdown } from './CostBreakdown';

interface BudgetTrackerProps {
  budget: Budget;
  onOpenModal?: () => void;
}

export function BudgetTracker({ budget, onOpenModal }: BudgetTrackerProps) {
  const percentUsed = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
  const isOverBudget = budget.spent > budget.limit && budget.limit > 0;

  return (
    <div className="budget-tracker">
      <div className="budget-header">
        <h3>Trip Budget</h3>
        <button onClick={onOpenModal} className="btn btn-sm btn-ghost">
          Edit
        </button>
      </div>

      {budget.limit > 0 ? (
        <>
          <div className="budget-progress">
            <div className="budget-bar">
              <div
                className={`budget-fill ${isOverBudget ? 'over-budget' : ''}`}
                style={{ width: `${Math.min(100, percentUsed)}%` }}
              />
            </div>
            <div className="budget-numbers">
              <span className={isOverBudget ? 'over-budget-text' : ''}>
                ${budget.spent.toLocaleString()} spent
              </span>
              <span>
                {isOverBudget ? (
                  <span className="over-budget-text">
                    ${Math.abs(budget.remaining).toLocaleString()} over
                  </span>
                ) : (
                  `$${budget.remaining.toLocaleString()} left`
                )}
              </span>
            </div>
          </div>

          <CostBreakdown breakdown={budget.breakdown} />
        </>
      ) : (
        <div className="budget-empty">
          <p>Set a budget to track your trip costs</p>
          <button onClick={onOpenModal} className="btn btn-primary btn-sm">
            Set Budget
          </button>
        </div>
      )}

      <div className="budget-estimate">
        <span className="estimate-label">Estimated total:</span>
        <span className="estimate-value">${budget.spent.toLocaleString()}</span>
      </div>
    </div>
  );
}
