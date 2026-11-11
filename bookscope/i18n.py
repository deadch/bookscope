MESSAGES = {
    "pt": {
        "searching": "Pesquisando",
        "no_results": "Nenhum resultado encontrado.",
        "sources": "Fontes disponíveis:",
        "invalid_lang": "Idioma inválido. Use pt ou en.",
    },
    "en": {
        "searching": "Searching",
        "no_results": "No results found.",
        "sources": "Available sources:",
        "invalid_lang": "Invalid language. Use pt or en.",
    },
}


def t(lang: str, key: str) -> str:
    return MESSAGES.get(lang, MESSAGES["pt"]).get(key, key)
