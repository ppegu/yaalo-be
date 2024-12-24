import { Router } from "express";
import homeFixure from "../../mocks/fixtures/home.fixure";
import User, { userValidationSchema } from "../../models/User";
import { AppResponse } from "../../utils/response.util";
import { validate } from "../../utils/validate.util";
import homeService from "./home.service";

const router = Router();

router.put(
  "/device-info",
  validate(userValidationSchema),
  async (req, _res, next) => {
    try {
      const deviceInfo = req.body;

      const existingUser = await User.findOne({
        deviceId: deviceInfo.deviceId,
      }).lean();

      if (existingUser) {
        return next(
          new AppResponse(200, "User with this device ID already exists")
        );
      }

      await User.create({
        ...deviceInfo,
      });

      next(new AppResponse(200, "Device info saved successfully"));
    } catch (error) {
      next(error);
    }
  }
);

router.get("/cards", async (req, _res, next) => {
  try {
    const dummyCards = homeFixure.homeCards;

    const { authorization: deviceId } = req.headers;

    const user = await User.findOne({ deviceId }).lean();

    if (!user) {
      return next(new AppResponse(404, "User not found"));
    }

    const cards = await homeService.getHomeCards(user._id, dummyCards);

    next(new AppResponse(200, "Home cards fetched successfully", cards));
  } catch (error) {
    next(error);
  }
});

export default router;
