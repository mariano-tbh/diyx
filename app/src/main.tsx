import "./index.css";
import { defineContext, mount } from "@diyx/lib";
import { UsersService } from "./tokens/users-service.token";
import { usersServiceImpl } from "./services/users-service.impl";
import { App } from "./app";

const appContext = defineContext(b =>
  b.for(UsersService).use({ value: usersServiceImpl })
)

const root = document.getElementById("app")!

const ctx = await appContext.build()

mount(root, <ctx.provide><App /></ctx.provide>)
