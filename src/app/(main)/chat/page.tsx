
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MOCK_CHAT_MESSAGES, MOCK_TODO_ITEMS, MOCK_USERS, addChatMessage, addTodoItem, toggleTodoItemCompletion, deleteTodoItem } from '@/lib/mock-data';
import type { ChatMessage, TodoItem, User } from '@/lib/types';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, ListChecks, PlusCircle, Trash2, UserCircle, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock current user (Bob Admin)
const CURRENT_USER_ID = MOCK_USERS[1].id;
const CURRENT_USER_NAME = MOCK_USERS[1].name;

const chatMessageSchema = z.object({
  text: z.string().min(1, { message: "Le message ne peut pas être vide." }),
});
type ChatMessageFormValues = z.infer<typeof chatMessageSchema>;

const todoItemSchema = z.object({
  text: z.string().min(1, { message: "La tâche ne peut pas être vide." }),
  assignedToUserId: z.string().optional(),
});
type TodoItemFormValues = z.infer<typeof todoItemSchema>;

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [todos, setTodos] = useState<TodoItem[]>(MOCK_TODO_ITEMS);
  const { toast } = useToast();

  const chatForm = useForm<ChatMessageFormValues>({
    resolver: zodResolver(chatMessageSchema),
    defaultValues: { text: "" },
  });

  const todoForm = useForm<TodoItemFormValues>({
    resolver: zodResolver(todoItemSchema),
    defaultValues: { text: "", assignedToUserId: "" },
  });

  const handleSendMessage = (data: ChatMessageFormValues) => {
    const newMessage = addChatMessage(data.text);
    setMessages(prev => [...prev, newMessage].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    chatForm.reset();
  };

  const handleAddTodo = (data: TodoItemFormValues) => {
    const newTodo = addTodoItem(data.text, data.assignedToUserId);
    setTodos(prev => [...prev, newTodo].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    todoForm.reset();
    toast({ title: "Tâche ajoutée", description: `"${newTodo.text}" a été ajoutée.` });
  };

  const handleToggleTodo = (todoId: string) => {
    toggleTodoItemCompletion(todoId);
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t));
  };
  
  const handleDeleteTodo = (todoId: string, todoText: string) => {
    deleteTodoItem(todoId);
    setTodos(prev => prev.filter(t => t.id !== todoId));
    toast({ title: "Tâche supprimée", description: `"${todoText}" a été supprimée.`, variant: "destructive" });
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }

  // Sort initial messages and todos
  useEffect(() => {
    setMessages(MOCK_CHAT_MESSAGES.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    setTodos(MOCK_TODO_ITEMS.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  }, []);


  return (
    <>
      <PageHeader
        title="Messagerie & Tâches de l'Équipe"
        description="Collaborez avec votre équipe, discutez et gérez les tâches."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Section */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" /> Fil de Discussion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[400px] w-full p-4 border rounded-md bg-muted/20">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-3 mb-4 ${msg.senderId === CURRENT_USER_ID ? 'justify-end' : ''}`}>
                  {msg.senderId !== CURRENT_USER_ID && (
                    <Avatar className="h-8 w-8 border">
                       <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(msg.senderName)}`} alt={msg.senderName} data-ai-hint="user initial"/>
                      <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`p-3 rounded-lg max-w-[70%] ${msg.senderId === CURRENT_USER_ID ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                    <p className="text-xs font-semibold mb-0.5">{msg.senderName}</p>
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1 text-right">{format(parseISO(msg.timestamp), 'HH:mm', { locale: fr })}</p>
                  </div>
                   {msg.senderId === CURRENT_USER_ID && (
                     <Avatar className="h-8 w-8 border">
                       <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(msg.senderName)}`} alt={msg.senderName} data-ai-hint="user initial"/>
                       <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {messages.length === 0 && <p className="text-muted-foreground text-center">Aucun message pour le moment.</p>}
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <form onSubmit={chatForm.handleSubmit(handleSendMessage)} className="flex w-full items-center gap-2">
              <Input {...chatForm.register("text")} placeholder="Écrivez un message..." className="flex-grow" />
              <Button type="submit" size="icon" disabled={chatForm.formState.isSubmitting}>
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </CardFooter>
           {chatForm.formState.errors.text && <p className="text-xs text-destructive px-6 pb-2">{chatForm.formState.errors.text.message}</p>}
        </Card>

        {/* To-Do List Section */}
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="h-6 w-6 text-accent" /> Liste de Tâches</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={todoForm.handleSubmit(handleAddTodo)} className="space-y-3 mb-6">
              <div>
                <Input {...todoForm.register("text")} placeholder="Nouvelle tâche..." />
                 {todoForm.formState.errors.text && <p className="text-xs text-destructive mt-1">{todoForm.formState.errors.text.message}</p>}
              </div>
              <div>
                <Controller
                  name="assignedToUserId"
                  control={todoForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Assigner à (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Non assigné</SelectItem>
                        {MOCK_USERS.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" size="sm" disabled={todoForm.formState.isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter la Tâche
              </Button>
            </form>
            <Separator className="my-4"/>
            <ScrollArea className="h-[300px] w-full pr-3">
              {todos.length > 0 ? todos.map((todo) => (
                <div key={todo.id} className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`todo-${todo.id}`}
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleTodo(todo.id)}
                    />
                    <label htmlFor={`todo-${todo.id}`} className={`text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {todo.text}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    {todo.assignedToUserName && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground p-1 px-1.5 bg-muted/50 rounded-md">
                        <UserCircle className="h-3 w-3" />
                        {todo.assignedToUserName.split(' ')[0]}
                      </div>
                    )}
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTodo(todo.id, todo.text)}>
                        <Trash2 className="h-4 w-4" />
                     </Button>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-sm text-center py-4">Aucune tâche pour le moment.</p>}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
