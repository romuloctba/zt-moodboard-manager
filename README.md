## 📑 Language | Idioma

- [English Version](#Moodboard-Manager-English-Version)
- [Versão em Português](#Moodboard-Manager-Versão-em-Português)

---

# Moodboard Manager (English Version)

## Table of Contents

- [Features](#-features)
- [Getting Started](#-getting-started)
- [Scripts](#-scripts)
- [Tech Stack](#-tech-stack)
- [Deployment](#-deployment)
- [Browser Support](#-browser-support)
- [License](#-license)
- [Contributing](#-contributing)

A visual reference management application for character creators, graphic novel artists, and storytellers. Built with Next.js 16 and designed as a Progressive Web App (PWA) for offline-first usage.

Current version allows fully local usage, with in-browser data storage, so no expensive/complex infrastructure is actually required to use this.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)

## ✨ Features

### Project & Character Management
- **Multiple Projects** - Organize your work into separate projects with custom metadata (genre, theme, tags)
- **Character Profiles** - Create detailed character sheets with age, role, personality traits, abilities, and backstory
- **Custom Fields** - Add your own custom fields to character profiles

### Visual Moodboard Canvas
- **Infinite Canvas** - Zoom and pan across your visual references with smooth controls
- **Image Arrangement** - Drag, resize, and rotate images freely on the canvas
- **Layer Management** - Bring images to front, lock items in place
- **Auto-save** - Canvas state is automatically saved as you work

### Image Management
- **Drag & Drop Upload** - Easy image import with bulk upload support
- **WebP Conversion** - All images converted to WebP for optimal quality and smaller file sizes
- **Smart Resizing** - Images capped at 2000px (longest side) while preserving visual quality
- **Thumbnail Generation** - Fast previews with auto-generated thumbnails
- **Color Palette Extraction** - Automatic color palette detection from images
- **Grid & Canvas Views** - Switch between grid gallery and canvas modes


### Storage & Backup
- **OPFS Storage** - Fast, persistent browser storage using Origin Private File System (IndexedDB fallback)
- **Full Backup/Restore** - Export your entire database and images as a ZIP file
- **Google Drive Auto Sync** - Seamlessly sync your data to Google Drive for backup and cross-device access. Requires setup of a Google API client and configuration of environment variables. See [GOOGLE_DRIVE_SYNC_SETUP.md](./docs/GOOGLE_DRIVE_SYNC_SETUP.md) for instructions.
- **Storage Monitoring** - Visual indicator showing used storage space

### Internationalization
- **Multi-language Support** - English and Brazilian Portuguese (pt-BR)
- **Easy Language Switching** - Change language from the UI

### PWA Features
- **Installable** - Add to home screen on mobile and desktop
- **Offline Support** - Works without internet connection via Service Worker
- **Responsive Design** - Optimized for desktop and tablet. (May also work on mobile)


## ☁️ Google Drive Sync Setup

To enable Google Drive auto sync, you must configure a Google API client and set up the required environment variables in a `.env` file. This is necessary for authentication and secure access to your Google Drive account.

**Setup Steps:**
1. Follow the instructions in [GOOGLE_DRIVE_SYNC_SETUP.md](./GOOGLE_DRIVE_SYNC_SETUP.md) to create a Google API client and obtain your credentials.
2. Add the required variables (such as `GOOGLE_CLIENT_ID`, etc.) to your `.env` file in the project root.
3. Restart the app after updating your environment variables.

For detailed, step-by-step guidance, see [GOOGLE_DRIVE_SYNC_SETUP.md](./GOOGLE_DRIVE_SYNC_SETUP.md).


- Node.js 20+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zt-moodboard-mgr

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production (standard Next.js) |
| `pnpm build:static` | Build static export for hosting on any web server |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm generate-icons` | Generate PWA icons from source image |


## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **UI**: [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **File Storage**: OPFS (Origin Private File System)
- **Image Processing**: Native Canvas API (WebP conversion), [ColorThief](https://lokeshdhakar.com/projects/color-thief/)
- **Canvas**: [react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch)
- **i18n**: [next-intl](https://next-intl-docs.vercel.app/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **PWA**: [next-pwa](https://github.com/shadowwalker/next-pwa)

## 📦 Deployment

The app can be deployed as a static site or with server-side rendering.

### Static Export (Recommended for simple hosting)

```bash
pnpm build:static
```

### Vercel/Node.js Server

```bash
pnpm build
pnpm start
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🌐 Browser Support

- Chrome/Edge 86+ (full OPFS support)
- Firefox 111+ (OPFS support)
- Safari 15.2+ (IndexedDB fallback)



## 📝 License

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/).

You are free to use, modify, and share this project for non-commercial purposes, as long as you give appropriate credit and distribute any derivative works under the same license.

> **Disclaimer:**
> THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## 🤝 Contributing

This is a free utility project, courtesy of Zoch Tecnologia. Check [LICENSE](./LICENSE) for licesing and distribution permissions.

---

# Moodboard Manager (Versão em Português)

## Sumário

- [Funcionalidades](#-funcionalidades)
- [Primeiros Passos](#-primeiros-passos)
- [Scripts](#-scripts)
- [Tecnologias](#-tecnologias)
- [Deploy](#-deploy)
- [Navegadores Suportados](#-navegadores-suportados)
- [Licença](#-licença)
- [Contribuição](#-contribuição)

Um aplicativo de gerenciamento de referências visuais para criadores de personagens, artistas de quadrinhos e contadores de histórias. Construído com Next.js 16 e projetado como um Progressive Web App (PWA) para uso offline-first.

A versão atual permite uso totalmente local, com armazenamento de dados no navegador, sem necessidade de infraestrutura cara ou complexa.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)

## ✨ Funcionalidades

### Gerenciamento de Projetos & Personagens
- **Múltiplos Projetos** - Organize seu trabalho em projetos separados com metadados personalizados (gênero, tema, tags)
- **Perfis de Personagem** - Crie fichas detalhadas com idade, papel, traços de personalidade, habilidades e história
- **Campos Personalizados** - Adicione seus próprios campos personalizados aos perfis

### Canvas Visual de Moodboard
- **Canvas Infinito** - Dê zoom e mova-se livremente pelas referências visuais
- **Arranjo de Imagens** - Arraste, redimensione e rotacione imagens livremente no canvas
- **Gerenciamento de Camadas** - Traga imagens para frente, bloqueie itens no lugar
- **Auto-salvamento** - O estado do canvas é salvo automaticamente enquanto você trabalha

### Gerenciamento de Imagens
- **Upload por Arrastar & Soltar** - Importe imagens facilmente, com suporte a upload em lote
- **Conversão para WebP** - Todas as imagens são convertidas para WebP para qualidade otimizada e arquivos menores
- **Redimensionamento Inteligente** - Imagens limitadas a 2000px (lado maior) preservando a qualidade visual
- **Geração de Miniaturas** - Visualizações rápidas com miniaturas automáticas
- **Extração de Paleta de Cores** - Detecção automática de paleta de cores das imagens
- **Visualização em Grade & Canvas** - Alterne entre galeria em grade e modo canvas


### Armazenamento & Backup
- **Armazenamento OPFS** - Armazenamento rápido e persistente no navegador usando Origin Private File System (fallback para IndexedDB)
- **Backup/Restauro Completo** - Exporte todo o banco de dados e imagens em um arquivo ZIP
- **Sincronização Automática com Google Drive** - Sincronize seus dados automaticamente com o Google Drive para backup e acesso entre dispositivos. Requer configuração de um cliente Google API e variáveis de ambiente. Veja [GOOGLE_DRIVE_SYNC_SETUP.md](./docs/GOOGLE_DRIVE_SYNC_SETUP.md) para instruções.
- **Monitoramento de Espaço** - Indicador visual mostrando o espaço utilizado

### Internacionalização
- **Suporte Multi-idioma** - Inglês e Português Brasileiro (pt-BR)
- **Troca Fácil de Idioma** - Altere o idioma pela interface

### Recursos PWA
- **Instalável** - Adicione à tela inicial no celular ou desktop
- **Suporte Offline** - Funciona sem conexão via Service Worker
- **Design Responsivo** - Otimizado para desktop e tablet (suporte mobile é possível)

## 🚀 Primeiros Passos

### Pré-requisitos

- Node.js 20+
- pnpm (recomendado) ou npm

### Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd zt-moodboard-mgr

# Instale as dependências
pnpm install

# Inicie o servidor de desenvolvimento
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## 📜 Scripts

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Inicia o servidor de desenvolvimento |
| `pnpm build` | Compila para produção (Next.js padrão) |
| `pnpm build:static` | Gera exportação estática para hospedagem |
| `pnpm start` | Inicia o servidor de produção |
| `pnpm lint` | Executa o ESLint |
| `pnpm generate-icons` | Gera ícones PWA a partir da imagem fonte |

## 🛠️ Tecnologias

- **Framework**: [Next.js 16](https://nextjs.org/) com App Router
- **UI**: [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/)
- **Componentes**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Gerenciamento de Estado**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Banco de Dados**: [Dexie.js](https://dexie.org/) (wrapper IndexedDB)
- **Armazenamento de Arquivos**: OPFS (Origin Private File System)
- **Processamento de Imagem**: API Canvas nativa (conversão WebP), [ColorThief](https://lokeshdhakar.com/projects/color-thief/)
- **Canvas**: [react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch)
- **i18n**: [next-intl](https://next-intl-docs.vercel.app/)
- **Animações**: [Framer Motion](https://www.framer.com/motion/)
- **PWA**: [next-pwa](https://github.com/shadowwalker/next-pwa)

## 📦 Deploy

O app pode ser publicado como site estático ou com renderização no servidor.

### Exportação Estática (Recomendado para hospedagem simples)

```bash
pnpm build:static
```

### Vercel/Servidor Node.js

```bash
pnpm build
pnpm start
```

Veja [DEPLOYMENT.md](./DEPLOYMENT.md) para instruções detalhadas de deploy.

## 🌐 Navegadores Suportados

- Chrome/Edge 86+ (suporte total a OPFS)
- Firefox 111+ (suporte a OPFS)
- Safari 15.2+ (fallback para IndexedDB)



## 📝 Licença

Este projeto está licenciado sob a [Creative Commons Atribuição-NãoComercial-CompartilhaIgual 4.0 Internacional (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-BR).

Você pode usar, modificar e compartilhar este projeto para fins não comerciais, desde que mantenha os devidos créditos e distribua trabalhos derivados sob a mesma licença.

> **Aviso legal:**
> ESTE SOFTWARE É FORNECIDO "NO ESTADO EM QUE SE ENCONTRA", SEM GARANTIAS DE QUALQUER TIPO, EXPRESSAS OU IMPLÍCITAS, INCLUINDO, MAS NÃO SE LIMITANDO ÀS GARANTIAS DE COMERCIALIZAÇÃO, ADEQUAÇÃO A UM PROPÓSITO ESPECÍFICO E NÃO VIOLAÇÃO. EM NENHUMA HIPÓTESE OS AUTORES OU DETENTORES DOS DIREITOS SERÃO RESPONSÁVEIS POR QUALQUER REIVINDICAÇÃO, DANO OU OUTRA RESPONSABILIDADE, SEJA EM UMA AÇÃO DE CONTRATO, ATO ILÍCITO OU DE OUTRA FORMA, DECORRENTE DE, FORA DE OU EM CONEXÃO COM O SOFTWARE OU O USO OU OUTRAS NEGOCIAÇÕES NO SOFTWARE.

## 🤝 Contribuição

Este Projeto é um utilitário gratuito da Zoch Tecnologia. Confira [LICENSE](./LICENSE) para detalhes de uso autorizados.
