*** Begin Patch
*** Update File: src/services/index.ts
@@
 // Analytics
 export * from './analytics.service';
 export { analyticsQueryKeys } from './analytics.service';
+// Skills
+export * from './skills.service';
+export { /* skillsQueryKeys? */ } from './skills.service';
*** End Patch