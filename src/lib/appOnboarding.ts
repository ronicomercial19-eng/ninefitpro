import { isExecutableTraining } from './executableTraining';
export interface OnboardingAnswers {
    welcome_seen?: boolean;
    full_name?: string;
    birthdate?: string | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    experience?: string;
    training_days?: number[];
    session_minutes?: number;
    training_environment?: string;
    equipment?: string[];
    current_pain?: boolean;
    movement_limitations?: string;
}
export interface AppOnboardingState {
    onboarding: {
        answers: OnboardingAnswers;
        revision: number;
        completed_at: string | null;
    } | null;
    full_name: string | null;
    birthdate: string | null;
    subscription: {
        name: string;
        expires_at: string | null;
        period: string | null;
        status: string;
    } | null;
    next_workout: {
        id: string;
        title: string;
        date: string;
    } | null;
    assignments: Parameters<typeof isExecutableTraining>[0][];
    first_workout_completed: boolean;
}
export const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const EQUIPMENT = { dumbbells: 'Halteres', barbell: 'Barra e anilhas', machines: 'Máquinas', bands: 'Elásticos', bench: 'Banco', mat: 'Colchonete' };
export const EXPERIENCE = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado' };
export const ENVIRONMENTS = { home: 'Casa', gym: 'Academia', outdoors: 'Ar livre' };
export function onboardingStep(state: AppOnboardingState, profileComplete: boolean) {
    const a = state.onboarding?.answers || {};
    if (state.onboarding?.completed_at)
        return 6;
    if (!a.welcome_seen)
        return 0;
    if (!a.full_name)
        return 1;
    if (!a.experience || !a.training_days?.length || !a.session_minutes || !a.training_environment || !a.equipment)
        return 2;
    if (typeof a.current_pain !== 'boolean' || typeof a.movement_limitations !== 'string')
        return 3;
    if (!profileComplete)
        return 4;
    return 5;
}
export function onboardingNextAction(state: AppOnboardingState, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())) {
    const a = state.onboarding?.answers;
    if (a?.current_pain || a?.movement_limitations?.trim())
        return { title: 'Solicite uma revisão antes do próximo treino', label: 'Solicitar orientação ao professor', href: '/9fit/acompanhamento?module=onboarding', review: true };
    if (state.next_workout && state.next_workout.date > today)
        return { title: 'Sua próxima sessão já tem uma data', label: 'Ver meu próximo treino', href: '/9fit/planejamento', review: false };
    if (state.next_workout || state.assignments?.some(isExecutableTraining))
        return { title: 'Sua ficha está pronta e há treino disponível', label: 'Conferir meu treino', href: '/9fit/train', review: false };
    return { title: 'Sua ficha está pronta; falta uma prescrição disponível', label: 'Solicitar meu primeiro treino', href: '/9fit/acompanhamento?module=training', review: false };
}
