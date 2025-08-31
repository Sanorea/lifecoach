export interface ToDos {
  title: string;
  description: string;
  category: string;
  priority: number;
  deadline: string;
  duration: number;
  frequency: string;
  id: string;
  done?: boolean;
  earliest: string;
}