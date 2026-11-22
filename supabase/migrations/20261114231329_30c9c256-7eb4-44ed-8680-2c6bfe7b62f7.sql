ALTER FUNCTION public.fn_billing_subscription_list() SECURITY INVOKER;
CREATE POLICY billing_admin_read ON public.user_subscriptions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=(select auth.uid()) AND ur.role::text IN('admin','super_admin')));
GRANT SELECT ON public.user_subscriptions TO authenticated;;
