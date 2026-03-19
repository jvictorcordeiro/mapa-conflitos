# Mapa de Conflitos

Aplicação React com Vite, TypeScript e MapLibre para visualização territorial de conflitos em Pernambuco.

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior

## Rodando localmente

1. Entre na pasta do projeto:

```bash
cd mapa-conflitos
```

2. Instale as dependências:

```bash
npm install
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

4. Abra no navegador o endereço exibido pelo Vite.

Normalmente:

```text
http://localhost:5173
```

## Scripts disponíveis

Iniciar em modo de desenvolvimento:

```bash
npm run dev
```

Gerar build de produção:

```bash
npm run build
```

Executar verificação de lint:

```bash
npm run lint
```

Visualizar localmente a build gerada:

```bash
npm run preview
```

## Estrutura importante

- `src/components/` componentes da interface, incluindo o mapa
- `src/pages/` páginas da aplicação
- `src/map/` configuração, helpers e definição de camadas do MapLibre
- `src/services/` serviços de dados e carregamento de GeoJSON
- `public/api/` base mockada de conflitos
- `public/geo/` arquivos GeoJSON carregados sob demanda

## Observações

- Os dados de conflitos usados atualmente são mockados e ficam em `public/api/conflicts.json`.
- As malhas territoriais são servidas como arquivos estáticos a partir de `public/geo/`.
- O projeto usa Tailwind CSS v4 com o plugin oficial do Vite.
