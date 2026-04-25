import { Routes, Route } from "react-router-dom";
import AdminCreate from "./routes/AdminCreate";
import AdminBoard from "./routes/AdminBoard";
import Join from "./routes/Join";
import Participant from "./routes/Participant";
import OwnerDashboard from "./routes/OwnerDashboard";
import OwnerRestore from "./routes/OwnerRestore";
import PresentView from "./routes/PresentView";
import NotFound from "./routes/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminCreate />} />
      <Route path="/s/:code/admin" element={<AdminBoard />} />
      <Route path="/s/:code/join" element={<Join />} />
      <Route path="/s/:code/p/:slug" element={<Participant />} />
      <Route path="/s/:code/present" element={<PresentView />} />
      <Route path="/owner" element={<OwnerDashboard />} />
      <Route path="/owner/restore" element={<OwnerRestore />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
