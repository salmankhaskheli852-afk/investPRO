import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { investmentPlans } from '@/lib/data';

export default function UserInvestmentsPage() {
  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline">Explore Investment Plans</h1>
        <p className="text-muted-foreground">Choose a plan that fits your financial goals.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {investmentPlans.map((plan) => (
          <InvestmentPlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
