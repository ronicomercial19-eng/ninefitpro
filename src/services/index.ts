*** Begin Patch
*** Update File: src/services/index.ts
@@
 // Periodization
 export * from './periodization.service';
 export { periodizationQueryKeys } from './periodization.service';
+
+// WeekPlan (smart week generator)
+export * from './weekplan.service';
+export { /* weekplanQueryKeys? */ } from './weekplan.service';
@@
 import * as periodizationService from './periodization.service';
 import * as analyticsService from './analytics.service';
+import * as weekplanService from './weekplan.service';
@@
   periodization: periodizationService.periodizationQueryKeys,
+  weekplan: (weekplanService as any).weekplanQueryKeys,
   analytics: analyticsService.analyticsQueryKeys,
 };
*** End Patch