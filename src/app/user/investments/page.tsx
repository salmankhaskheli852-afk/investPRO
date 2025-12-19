import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { investmentPlans, planCategories } from '@/lib/data';

export default function UserInvestmentsPage() {
  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline">Explore Investment Plans</h1>
        <p className="text-muted-foreground">Admin can create new categories and add plans to them.</p>
      </div>
      
      {planCategories.map(category => {
        const plansInCategory = investmentPlans.filter(plan => plan.categoryId === category.id);
        if (plansInCategory.length === 0) return null;

        return (
          <div key={category.id} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold font-headline">{category.name}</h2>
              <p className="text-muted-foreground">Plans in the {category.name.toLowerCase()} category.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {plansInCategory.map((plan) => (
                <InvestmentPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
