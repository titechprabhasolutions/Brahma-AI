def on_command(text: str, context: dict):
    if "hello plugin" in text.lower():
        return "Plugin says hi!"
    return None
