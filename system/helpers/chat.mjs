export async function sendToChat({ actor, item }) {
  if (item)
    return _sendItemDescription(item);
}

async function _sendItemDescription(item) {
  const content = item.system.description ?? "";
  const flavor = item.name;
  return _sendToChat(item.actor, flavor, content);
}

async function _sendToChat(actor, flavor, content) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const rollMode = game.settings.get('core', 'rollMode');

  ChatMessage.create({
    speaker: speaker,
    rollMode: rollMode,
    flavor: flavor,
    content: content,
  });
}
