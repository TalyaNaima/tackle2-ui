import React from "react";
import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "./Routes";
import { DefaultLayout } from "./layout";
import { NotificationsProvider } from "./components/NotificationsContext";
import { TaskManagerProvider } from "./components/task-manager/TaskManagerContext";
import VersionChecker from "../app/versoinChecker";

import "./app.css";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationsProvider>
        <TaskManagerProvider>
          <DefaultLayout>
            <AppRoutes />
            <VersionChecker />
          </DefaultLayout>
        </TaskManagerProvider>
      </NotificationsProvider>
    </BrowserRouter>
  );
};

export default App;
