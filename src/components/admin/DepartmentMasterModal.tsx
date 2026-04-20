import { useState } from "react";
import { Plus, Trash2, Loader2, Pencil, Building2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments } from "@/hooks/useDepartments";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

const DepartmentMasterModal = ({ open, onOpenChange, onChanged }: Props) => {
  const { departments, refresh } = useDepartments(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const reload = async () => {
    await refresh();
    onChanged?.();
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { toast.error("部門名を入力してください"); return; }
    if (departments.some(d => d.name === name)) { toast.error("同名の部門が既に存在します"); return; }
    setAdding(true);
    const maxOrder = departments.reduce((m, d) => Math.max(m, d.sortOrder), 0);
    const { error } = await supabase.from("departments").insert({ name, sort_order: maxOrder + 1 });
    setAdding(false);
    if (error) { toast.error(`追加に失敗: ${error.message}`); return; }
    toast.success(`部門「${name}」を追加しました`);
    setNewName("");
    await reload();
  };

  const startEdit = (id: string, name: string) => { setEditingId(id); setEditName(name); };
  const cancelEdit = () => { setEditingId(null); setEditName(""); };

  const handleSaveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) { toast.error("部門名を入力してください"); return; }
    if (departments.some(d => d.id !== id && d.name === name)) { toast.error("同名の部門が既に存在します"); return; }
    setSavingId(id);
    const { error } = await supabase.from("departments").update({ name }).eq("id", id);
    setSavingId(null);
    if (error) { toast.error(`更新に失敗: ${error.message}`); return; }
    toast.success("部門名を更新しました");
    cancelEdit();
    await reload();
  };

  const handleToggleActive = async (id: string, next: boolean) => {
    const { error } = await supabase.from("departments").update({ is_active: next }).eq("id", id);
    if (error) { toast.error(`変更に失敗: ${error.message}`); return; }
    toast.success(next ? "有効化しました" : "無効化しました");
    await reload();
  };

  const handleDelete = async (id: string, name: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) {
      toast.error("削除に失敗しました。既存の提案者が所属している可能性があります。代わりに無効化を検討してください。");
      return;
    }
    toast.success(`部門「${name}」を削除しました`);
    await reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            部門マスタ管理
          </DialogTitle>
          <DialogDescription>
            提案者・改善案で選択できる部門の一覧を管理します。無効化した部門は新規選択肢から外れますが、既存データの表示は維持されます。
          </DialogDescription>
        </DialogHeader>

        {/* Add */}
        <div className="rounded-lg border border-border p-3 space-y-2">
          <Label className="text-xs">新しい部門を追加</Label>
          <div className="flex gap-2">
            <Input
              placeholder="例: 品質保証部"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={adding} className="shrink-0">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              追加
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">登録済み部門 ({departments.length}件)</p>
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">部門が未登録です</p>
          ) : (
            departments.map(d => (
              <div key={d.id} className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/30">
                {editingId === d.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 h-8"
                      onKeyDown={e => e.key === "Enter" && handleSaveEdit(d.id)}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(d.id)} disabled={savingId === d.id}>
                      {savingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-green-600" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{d.name}</span>
                    {!d.isActive && <Badge variant="outline" className="text-xs">無効</Badge>}
                    <Switch
                      checked={d.isActive}
                      onCheckedChange={(v) => handleToggleActive(d.id, v)}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(d.id, d.name)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>「{d.name}」を削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            この部門に所属する提案者がいる場合は削除できません。その場合は「無効化」を使ってください（既存データの表示は維持されます）。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(d.id, d.name)} className="bg-destructive text-destructive-foreground">
                            削除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">閉じる</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentMasterModal;
