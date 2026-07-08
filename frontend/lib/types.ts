export interface Space {
  id: string;
  user_id: string;
  name: string;
  instructions: string;
  created_at: string;
}

export interface Document {
  id: string;
  space_id: string;
  file_url: string;
  filename: string;
  status: "pending" | "processing" | "ready" | "failed";
  created_at: string;
}

export interface Chat {
  id: string;
  space_id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
