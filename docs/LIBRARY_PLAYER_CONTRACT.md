# Contrato do player da biblioteca dentro do FitPro

O FitPro abre o conteúdo da biblioteca (`bibliteoca9fit.lovable.app`) em um iframe e grava o progresso do aluno
(tempo assistido, onde parou) via `fn_library_progress`. O lado do FitPro já está pronto; a biblioteca precisa
implementar os dois pontos abaixo.

## 1. Parâmetros recebidos na URL do player

`?fitpro=1&assignment=<uuid>&t=<segundos>`

- `fitpro=1`: está dentro do FitPro (esconder chrome desnecessário, se quiser).
- `assignment`: id da atribuição. **Devolver em toda mensagem.**
- `t`: segundo para retomar (só vem quando o aluno já assistiu mais de 5 s).

## 2. Mensagens enviadas ao FitPro

```js
const params = new URLSearchParams(location.search);
const assignmentId = params.get("assignment");
const inFitpro = params.get("fitpro") === "1" && window.parent !== window;

function report(video, state) {
  if (!inFitpro || !assignmentId) return;
  window.parent.postMessage({
    type: "nine-library-progress",
    assignmentId,
    positionSec: Math.floor(video.currentTime),
    durationSec: Math.floor(video.duration || 0),
    state, // "playing" | "timeupdate" | "paused" | "ended"
  }, "*"); // o FitPro valida event.origin do lado dele
}

// retomar
const t = Number(params.get("t") || 0);
if (t > 0) video.currentTime = t;

video.addEventListener("timeupdate", () => report(video, "timeupdate"));
video.addEventListener("pause", () => report(video, "paused"));
video.addEventListener("ended", () => report(video, "ended"));
```

## Regras do lado do FitPro

- Grava no máximo a cada 15 s (pausa e fim gravam na hora).
- Voltar o vídeo não reduz o progresso; o tempo assistido sobe no máximo 60 s por chamada.
- Concluiu em ≥ 90%: marca a atribuição como concluída automaticamente.
- Sem as mensagens do player, o botão manual "Marcar concluído" continua funcionando.
- Se a biblioteca enviar `X-Frame-Options: DENY` ou `frame-ancestors` restrito, o iframe não carrega; liberar o domínio do FitPro em `frame-ancestors`.
