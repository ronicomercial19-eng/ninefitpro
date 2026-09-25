# QA do aluno Fernanda

A conta de QA deve ser criada/ativada no Supabase Auth e vinculada a um registro em `athletes` com `user_id` igual ao usuário autenticado e papel de aluno. As credenciais não ficam no repositório.

## Reprovação do acesso

1. Use o e-mail e a senha armazenados no cofre de QA.
2. Entre pela rota `/9fit/login`.
3. Confirme que o reload mantém a sessão e que `/9fit/logout` limpa a sessão e o estado local.
4. Confirme que a conta não reaproveita chaves `9fit_*` de outro usuário.

## Pré-condições do registro

- `auth.users.id` ligado a `athletes.user_id`.
- `athletes.role`/papel equivalente a aluno.
- `athlete_auth_link` apontando para o mesmo `athlete_id` quando usado pelo projeto.
- Perfil de teste sem dados inventados de classe, presença ou métricas.
