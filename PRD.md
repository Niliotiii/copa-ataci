# Product Requirements Document (PRD) - Copa Ataci (4ª Edição)

## 1. Visão Geral do Produto
O projeto visa o desenvolvimento de uma aplicação web responsiva (Mobile-First) para acompanhar a 5ª Edição da **Copa Ataci**. A plataforma servirá como o portal oficial do torneio, apresentando classificação, calendário de jogos, chaveamento do mata-mata e detalhes dos elencos de forma interativa.

A grande premissa técnica é a **ausência de um backend tradicional**. Toda a aplicação será alimentada por arquivos estáticos `.json` hospedados junto com o frontend na **Cloudflare Pages**, garantindo alta velocidade, disponibilidade global (CDN) e custo zero de infraestrutura.

## 2. Objetivos
* **Acessibilidade Móvel:** Garantir que a experiência no celular seja perfeita, visto que a maioria dos jogadores e torcedores acessará a plataforma em campo ou via redes sociais.
* **Baixa Manutenção Técnica:** Utilizar a arquitetura Serverless/JAMstack (arquivos JSON) para que qualquer organizador possa atualizar os resultados apenas editando textos simples.
* **Engajamento Visual:** Entregar uma visualização de escalações semelhante ao "Cartola FC", aumentando a imersão e profissionalismo da várzea/torneio amador.

## 3. Escopo de Funcionalidades

### 3.1. Tabela de Classificação
* Tabela dinâmica gerada a partir de `tabela.json`.
* **Responsividade:** No celular, exibirá apenas as colunas essenciais (Posição, Time, Pontos, Jogos, Saldo de Gols). No desktop, expande para mostrar Vitórias, Empates, Derrotas e Gols Pró/Contra.
* Indicadores visuais para zona de classificação (ex: verde para os que avançam ao mata-mata).

### 3.2. Calendário de Jogos (Partidas)
* Lista de jogos lida de `jogos.json`.
* Filtros por fase (Fase de Grupos, Quartas, Semis, Final) ou por rodada.
* Exibição de Data, Horário, Local (campo), Times e Placar (se o jogo já tiver sido finalizado).

### 3.3. Chaveamento (Mata-mata)
* Representação visual da árvore de torneio gerada via `chaveamento.json`.
* **Responsividade:** Como árvores de torneio quebram em telas estreitas, a versão mobile utilizará scroll horizontal (`overflow-x: auto`) ou navegação por abas (Quartas -> Semis -> Final) para manter a usabilidade.

### 3.4. Visão de Times e Escalação ("Modo Cartola")
* Página dedicada a cada equipe listada em `times.json`.
* **O Campinho:** Um componente visual que simula um campo de futebol (imagem de fundo) onde os avatares/nomes dos jogadores são renderizados.
* **Mecanismo:** Os jogadores serão posicionados via CSS (Position Absolute) com base em coordenadas X e Y percentuais configuradas no JSON (ex: `pos_x: 50%, pos_y: 90%` para o goleiro), garantindo que o layout nunca quebre, independentemente do tamanho da tela.

## 4. Arquitetura e Stack Tecnológica
* **Frontend:** HTML5, CSS3, JavaScript (Recomenda-se React.js via Vite, Vue.js ou Alpine.js para facilitar a reatividade dos JSONs).
* **Estilização:** Tailwind CSS (pela agilidade na construção de layouts responsivos).
* **Banco de Dados:** Arquivos `.json` estáticos alocados na pasta `/public/data/`.
* **Hospedagem e CI/CD:** **Cloudflare Pages**. Conectado ao repositório GitHub, todo commit na branch principal fará o deploy automático e a invalidação de cache no Edge.

## 5. Estrutura de Dados (JSONs)

### `tabela.json`
Array de objetos contendo: `id`, `nome`, `escudo`, `pontos`, `jogos`, `vitorias`, `empates`, `derrotas`, `gols_pro`, `gols_contra`, `saldo_gols`.

### `jogos.json`
Array de objetos contendo: `id_jogo`, `fase`, `rodada`, `data`, `horario`, `local`, `time_casa` (id, nome, gols), `time_fora` (id, nome, gols), `status` (agendado, andamento, finalizado).

### `times.json`
Objeto indexado por ID do time contendo: `nome`, `escudo`, `esquema_tatico`, `jogadores` (array com `nome`, `foto`, `pos_x`, `pos_y`).

### `chaveamento.json` (Opcional - pode derivar de jogos)
Estrutura em árvore para renderizar os confrontos eliminatórios de forma hierárquica.

## 6. Requisitos Não-Funcionais
* **Performance:** Pontuação acima de 90 no Google Lighthouse (Performance e Práticas Recomendadas).
* **Cache:** Configurar regras de cache no Cloudflare para que a página inicial tenha TTL curto (ex: 5 minutos em dia de jogos) e os assets (imagens do campo, escudos) tenham TTL longo.
* **SEO & Compartilhamento:** Configuração de Open Graph tags (Meta tags) para que links compartilhados no WhatsApp exibam o título, descrição e a logo da Copa Ataci de forma atrativa.

## 7. Próximos Passos (Roadmap)
1. **Fase 1 (Design & Setup):** Inicialização do repositório, configuração do Vite + Tailwind, e deploy inicial na Cloudflare Pages.
2. **Fase 2 (Dados Mockados):** Criação dos 4 arquivos JSON com dados fictícios para apoiar o desenvolvimento do layout.
3. **Fase 3 (Desenvolvimento UI):** Criação dos componentes (Tabela, Lista de Jogos, Chaveamento).
4. **Fase 4 (O Campinho):** Desenvolvimento do componente complexo de posicionamento dos jogadores percentualmente.
5. **Fase 5 (Testes & Lançamento):** Validação de layout em dispositivos móveis reais e lançamento oficial da plataforma.