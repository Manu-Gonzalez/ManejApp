import UserController from "./user.controller";
import GenericRouter from "../shared/classes/GenericRouter";
import {registerSchema, loginSchema, getUserByRoleSchema, updateRoleSchema} from "./user.schema" ;
import { validate } from "./user.middleware";
import { validateParams } from "@shared/middlewares/zod/validateParams";

export default class UserRouter extends GenericRouter {
    constructor(private readonly userController: UserController) {

        super();
        const router = this.init();

        router.get("/", this.userController.getAll);
        router.get("/:value", this.userController.getUserById)
        router.get("/role/:role", validateParams(getUserByRoleSchema), this.userController.getByRol)

        router.post("/register", validate(registerSchema), this.userController.register);
        router.post("/login", validate(loginSchema), this.userController.login);

        router.patch("/:id/role", validate(updateRoleSchema), this.userController.updateRole);

    }
}