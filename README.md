# BookScope

BookScope é um agregador de pesquisa de livros e acervos digitais executável pelo terminal em Linux, Windows e Termux.

O projeto pesquisa metadados e links de consulta em múltiplas fontes, sem baixar ou hospedar PDFs. A arquitetura é baseada em adaptadores: novas bibliotecas, catálogos acadêmicos, arquivos digitais e fontes comunitárias podem ser adicionados ao `data/sources.json`.

## Fontes iniciais

- Open Library
- Google Books
- Internet Archive

A lista não é limitada a bibliotecas institucionais. `sources.json` separa fontes por categoria (`official`, `community`, `academic`, `archive`, `catalog`) para permitir a expansão do índice.

## Idiomas

A interface aceita:

- `pt` — português
- `en` — inglês

A preferência influencia mensagens e filtros de idioma quando a API oferece suporte.

## Instalação

### Linux / Windows

Requer Python 3.10+.

```text
python -m bookscope --help
```

Ou, a partir do diretório do projeto:

```text
python -m bookscope search "álgebra linear" --lang pt
```

### Termux

```text
pkg install python
python -m bookscope search "linear algebra" --lang en
```

## Exemplos

```text
python -m bookscope search "dom casmurro" --lang pt
python -m bookscope search "quantum mechanics" --lang en --limit 10
python -m bookscope sources --lang pt
python -m bookscope search "python" --source openlibrary
```

## Princípio do projeto

BookScope funciona como um índice federado: pesquisa em fontes diferentes e devolve o caminho para a página original.

Ele não:

- hospeda livros;
- redistribui PDFs;
- contorna paywalls, DRM ou autenticação;
- tenta transformar resultados de pesquisa em downloads automáticos.

A lista de fontes é deliberadamente extensível. Uma fonte comunitária pode ser cadastrada no índice mesmo que não seja uma biblioteca oficial, desde que seu acesso seja apropriado para indexação e consulta.

## Estrutura

```text
bookscope/
├── bookscope/
│   ├── __init__.py
│   ├── __main__.py
│   ├── cli.py
│   ├── i18n.py
│   ├── models.py
│   └── providers.py
├── data/
│   └── sources.json
├── tests/
│   └── test_models.py
├── pyproject.toml
└── README.md
```

## Evolução planejada

1. Adicionar mais provedores por adaptador.
2. Criar cache local SQLite.
3. Normalizar ISBN, DOI, autores e edições.
4. Deduplicar resultados por ISBN/DOI/título+autor.
5. Adicionar busca por assunto, autor, ISBN e ano.
6. Adicionar classificação por tipo de fonte.
7. Adicionar interface TUI opcional.
8. Criar testes de contrato para cada provedor.
