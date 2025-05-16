# MCP Email Server - Documentație

Acest proiect reprezintă o aplicație (server MCP) pentru gestionarea email-urilor prin intermediul API-ului Gmail, folosind protocolul Model Context Protocol (MCP).

## Descriere Generală

- **Funcționalitate de bază**:
  1. Trimite, citește și caută email-uri folosind contul de Gmail.
  2. Gestionează ciorne (drafts).
  3. Gestionează atașamente (downloading attachments).
  4. Gestionează label-uri (etichete) precum Inbox, Unread, etc.
  5. Oferă o serie de "tools" MCP ca endpoints de acces.
  6. Permite operații de "reply all", "forward", "archive", "trash" etc.
- **Interacțiune**: Serverul poate rula în mod "stdin/stdout", acceptând cereri sub formă de mesaje JSON, conform specificației MCP.
- **Tehnologii**: Node.js, TypeScript, Google Gmail API, OAuth2 pentru autentificare, zod pentru validare.

### Structura Proiectului

1. **`src/`**: Directorul principal cu cod sursă TypeScript.
   - **`tools/`**: Conține fișiere cu diverse "tool"-uri MCP, fiecare fiind un modul care implementează logica pentru o operație specifică (ex: `search_emails`, `read_email`, `save_attachment`, etc.).
   - **`client-wrapper.ts`**: Wrapper pentru Google Gmail API, în care se definesc metodele de bază (listarea mesajelor, extragerea conținutului, manipularea label-urilor).
   - **`server.ts`** și **`index.ts`**: Punctele de intrare/inițializare a serverului MCP, logica de pornire, plus configurarea transportului (stdin/out).
   - **`utils.ts`**: Utilitare diverse (ex: convertirea conținutului, formatare data/oră, quoting pentru reply, etc.).
   - **`prompt-handler.ts`**: Logica de generare a "prompturilor" de tip MCP.
   - **`tool-handler.ts`**: Acesta face maparea între cererile MCP pentru "CallToolRequest" și modulele de tip "Tool".
   - **`timezone-utils.ts`**: Gestionarea fusului orar, offset-ul de la GMT, formatarea datei etc.
   - **`version.ts`**: Reține versiunea aplicației.

2. **`package.json`**: Configurația Node (dependințe, scripturi de build și rulare).
3. **`tsconfig.json`**: Configurația TypeScript.
4. **`CHANGELOG.md`**: Istoricul modificărilor.

Aplicația folosește:

- **`dotenv`** pentru încărcarea variabilelor de mediu (ex: TIME_ZONE, DEFAULT_ATTACHMENTS_FOLDER).
- **`googleapis`** și **`google-auth-library`** pentru interacțiunea cu Gmail API.
- **`@modelcontextprotocol/sdk`** pentru configurarea serverului MCP și gestionarea tipurilor (tool-uri, requesturi, etc.).

## Principiul de Funcționare

1. **Autentificare Gmail**:
   - Aplicația necesită un fișier de credențiale OAuth Google (`gcp-oauth.keys.json`) și stocarea token-ului (`credentials.json`) după autentificare.
   - Dacă nu există fișierul cu token, aplicația lansează un server HTTP local pe portul 3000 pentru codul de redirect și cere utilizatorului să deschidă un link Google pentru a finaliza OAuth2.

2. **Rulare MCP Server**:
   - Odată autentificat, serverul pornește pe stdio și așteaptă request-uri de tip JSON (conforme cu schema `@modelcontextprotocol/sdk`).
   - Request-urile pot fi de tip `ListToolsRequest` (pentru a lista tool-uri) sau `CallToolRequest` (pentru a executa un tool cu anumiți parametri).
   - Fiecare tool (ex: `search_emails`, `read_email`, `send_email`) are un input schema și un `handler` care apelează metoda corespunzătoare din `GmailClientWrapper`.

3. **Tool-uri principale**:
   - **`search_emails`**: caută email-uri după query, parametri de timp, categorie etc.
   - **`get_recent_emails`**: formă specială pentru email-urile recente (similar cu `search_emails`, dar parametrii puțin diferiți).
   - **`read_email`**: citește corpul unui email (ID necesar).
   - **`send_email`**: trimite un email nou (specifici `to`, `subject`, `body`, etc.).
   - **`reply_all_email`**: răspunde la toată lumea (inclusiv CC) pentru un mesaj existent.
   - **`list_attachments`** și **`save_attachment`**: gestionarea atașamentelor (listare și salvare în folder).
   - **Label management**: `list_labels`, `create_label`, `delete_label`, etc.
   - **Draft management**: `create_draft`, `update_draft`, `send_draft`, etc.

4. **Configurări Importante**:
   - **`DEFAULT_ATTACHMENTS_FOLDER`**: Directorul implicit pentru salvarea atașamentelor. Trebuie setat în fișier `.env` sau alt mecanism. Aplicația dă eroare dacă nu există.
   - **`TIME_ZONE`**: String de forma `"GMT+2"` sau `"GMT-5"` pentru a controla offset-ul datei și orei afișate în rapoarte.
   - **`GMAIL_OAUTH_PATH`** și **`GMAIL_CREDENTIALS_PATH`**: Puteți seta căi custom pentru fișierele de OAuth și token, altfel se folosesc locații implicite.

## Instalare și Utilizare

1. **Clonare & instalare**:
   ```bash
   git clone https://github.com/<user>/MCP-email-server.git
   cd MCP-email-server
   npm install
   ```

2. **Configurare OAuth**:
   - Aveți nevoie de un fișier `gcp-oauth.keys.json` (de obicei conține câmpurile `client_id`, `client_secret` și `redirect_uris`).
   - Implicit, aplicația caută acest fișier în `~/.email-mcp/gcp-oauth.keys.json`.
   - Dacă îl puneți în folderul curent, scriptul îl va copia automat în folderul global.

3. **Autentificare**:
   ```bash
   npm run build
   npm run auth
   ```
   - Scriptul va lansa un server local pe `localhost:3000`.
   - Veți primi un link de la Google pentru a aproba accesul la Gmail.
   - După ce introduceți codul de autentificare, se creează `credentials.json`.

4. **Rulare server**:
   ```bash
   npm start
   ```
   - Va începe un server MCP pe STDIN/STDOUT.
   - În general, acest server este integrat cu un alt orchestrator (ex. un LLM) care trimite request-uri JSON.

5. **Testare manuală** (opțional):
   - E posibil să trimiteți cereri JSON de testare la STDIN.
   - De obicei, se face redirect cu un alt tool ce implementează logica de test sau cu `@modelcontextprotocol/cli`.

## Observații

- **Fus Orar**: Aplicația aplică un offset la data și ora email-urilor, astfel încât `timeFilter= "today"`, de exemplu, să fie interpretat conform fusului orar configurat.
- **Fișiere temporare**: Datele OAuth și credențialele se stochează local. A se avea grijă la securitate și la fișierele `.env`.

## Concluzii

Proiectul este un **server MCP** care expune operații de email prin Gmail API, configurabil prin environment, cu accent pe:
- Securitate (restricționarea salvării atașamentelor într-un director anume).
- Extensibilitate (fiecare operațiune e un tool logic separat).
- Flexibilitate (posibilitatea de a customiza datele, orele, label-urile, etc.).
- Ușor integrabil cu alte aplicații care știu să comunice conform protocolului MCP.

Pentru mai multe detalii, consultați și fișierul `CHANGELOG.md` cu istoricul versiunilor.