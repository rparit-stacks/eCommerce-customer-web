import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";
import authSlice from "./slices/authSlice";
import cartSlice from "./slices/cartSlice";
import checkoutSlice from "./slices/checkoutSlice";
import offlineCartSlice from "./slices/offlineCartSlice";
import recentlyViewedSlice from "./slices/recentlyViewedSlice";

/** In-browser fallback when localStorage is blocked (private mode, etc.). */
const clientMemoryFallback: Record<string, string> = {};

/** SSR: no persistence. Client: localStorage or in-memory fallback (no redux-persist sync error). */
function buildPersistStorage() {
  if (typeof window === "undefined") {
    return {
      getItem: () => Promise.resolve(null),
      setItem: (_key: string, value: string) => Promise.resolve(value),
      removeItem: () => Promise.resolve(),
    };
  }
  try {
    const k = "__redux_persist_probe__";
    window.localStorage.setItem(k, k);
    window.localStorage.removeItem(k);
    return createWebStorage("local");
  } catch {
    return {
      getItem: (key: string) =>
        Promise.resolve(
          Object.prototype.hasOwnProperty.call(clientMemoryFallback, key)
            ? clientMemoryFallback[key]
            : null,
        ),
      setItem: (key: string, value: string) => {
        clientMemoryFallback[key] = value;
        return Promise.resolve(value);
      },
      removeItem: (key: string) => {
        delete clientMemoryFallback[key];
        return Promise.resolve();
      },
    };
  }
}

const persistConfig = {
  key: "root",
  storage: buildPersistStorage(),
};

const rootReducer = combineReducers({
  auth: authSlice,
  cart: cartSlice,
  checkout: checkoutSlice,
  offlineCart: offlineCartSlice,
  recentlyViewed: recentlyViewedSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
        ignoredPaths: ["register"],
      },
    }),
});

export const persistor = persistStore(store);

export type AppStore = typeof store;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
