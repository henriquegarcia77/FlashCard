# 📚 Flashcards · Escrevente TJSP

Site de flashcards no estilo Anki, com repetição espaçada (botões Novamente / Difícil / Bom / Fácil).
Já vem com cerca de 3.000 dispositivos de lei organizados por matéria e tema do edital do TJSP.

## O que tem
- **Estudar**: cartões de lacuna (omissão de palavras) e de pergunta/resposta, com o artigo citado no topo.
- **Criar**: crie seus próprios cartões. Selecione um trecho e clique em "Ocultar".
- **Temas**: todos os temas do edital, com quantidade de cartões e quantos estão difíceis.
- **Importar Anki**: importa arquivos `.apkg`.
- **Progresso**: respostas de hoje, dias seguidos 🔥, % de acerto por matéria, temas para reforçar e últimas respostas.
- **Lembretes**: adicione um lembrete diário no Google Agenda (ou baixe um `.ics`), e ative notificações no navegador.
- **Backup**: exporte e restaure suas respostas em um arquivo `.json`.

## Onde ficam salvas as respostas
Tudo fica salvo **no navegador de quem usa** (localStorage):
- `flashcards_v2`: andamento de cada cartão (nível, próxima revisão) e cartões criados
- `flashcards_hist`: histórico de cada resposta (cartão, botão, data e hora)

Por isso, cada pessoa tem o seu progresso. Para trocar de aparelho, use **Progresso → Exportar backup** e depois **Restaurar backup** no outro aparelho.

## Publicar no GitHub Pages
1. Crie um repositório no GitHub (ex.: `flashcards`).
2. Envie todos os arquivos desta pasta (`index.html`, `app.js`, `topics.js`, `deck.json`, `style.css`, `manifest.json`).
3. No repositório: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`** → Save.
4. Em 1 ou 2 minutos o site fica em `https://SEU-USUARIO.github.io/flashcards/`.

> Abrir o `index.html` direto com dois cliques não carrega os cartões, porque o navegador bloqueia a leitura do `deck.json`.
> Para testar no computador: `python -m http.server` dentro da pasta e acesse `http://localhost:8000`.

## Adicionar ou editar os cartões prontos
Edite o `deck.json`. Cada cartão segue este formato:
```json
{"id":"unico_1_c1","mat":"Português","tema":"Crase","src":"Fonte opcional",
 "type":"cloze","cl":1,"front":"Texto com {{c1::lacuna}}","back":""}
```
- `type: "cloze"`: um cartão para cada número de lacuna (`cl`: 1, 2, 3…)
- `type: "basic"`: `front` é a pergunta e `back` é a resposta
- As matérias e os temas do edital ficam em `topics.js`.

Não mude o `id` de um cartão que já existe, porque o progresso salvo é ligado a ele.
