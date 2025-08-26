export interface ToDos {
    title: string;
    description: string;
    category: string;
    priority: number;
    deadline: string;
    id: string;
      done?: boolean; // optional (default = false)
}