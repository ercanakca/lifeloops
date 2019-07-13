"use strict";

class ChatController {
  constructor({ socket, request }) {
    this.socket = socket;
    this.request = request;
    this.users = [];
    this.index = 0;
    console.log("tetik: 1")
  }

  onMessage(data) {
    switch (data.type) {
      case "ADD_USER": {
        this.index = this.users.length;
        this.users.push({ name: data.name, id: this.index + 1 });
        let users = this.users;
        let index = this.index;
        this.socket.broadcast("message", {
          type: "USERS_LIST",
          users
        });
        break;
      }
      case "ADD_MESSAGE":
        this.socket.broadcast("message", {
          type: "ADD_MESSAGE",
          message: data.message,
          author: data.author
        });
        break;
      default:
        break;
    }
  }
  onClose() {
    this.users.splice(this.index, 1);
    this.socket.broadcast("message", { type: "USERS_LIST", users });
  }
}

module.exports = ChatController;
