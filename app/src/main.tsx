import "./index.css";
import { defineContext, mount } from "@diyx/lib";
import { UsersService } from "./tokens/users-service.token";
import { usersServiceImpl } from "./services/users-service.impl";
import { App } from "./app";

const appContext = defineContext((b) => b.use(UsersService, usersServiceImpl));

const root = document.getElementById("app")!;

mount(
  root,
  <appContext.provide>
    <App />
  </appContext.provide>,
);
