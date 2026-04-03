import { useState } from "react";
import { UserPlus, Pencil, Trash2, Users, Building2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useKaios, type Person } from "@/contexts/KaiosContext";
import UITour, { type TourStep } from "@/components/kaios/UITour";

const PEOPLE_TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="add-person"]', title: "① 提案者を追加", description: "名前・部門・役職・入社年数を入力して新しいメンバーを登録します。登録後、改善入力ページで選択可能になります。", position: "bottom" },
  { selector: '[data-tour="stats"]', title: "② 統計概要", description: "登録者数、所属部門数、平均勤続年数が一目で確認できます。", position: "bottom" },
  { selector: '[data-tour="people-list"]', title: "③ 提案者一覧", description: "登録済みメンバーの一覧です。鉛筆アイコンで編集、ゴミ箱アイコンで削除できます。", position: "top" },
];
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DEPARTMENTS = [
  "カスタマーサポート部", "情報システム部", "営業部", "経営企画部",
  "製造部", "経理部", "物流部", "総務部", "人事部", "マーケティング部",
];

const PeopleManagementPage = () => {
  const { people, addPerson, updatePerson, deletePerson, getKaizenByPerson } = useKaios();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDept, setFormDept] = useState(DEPARTMENTS[0]);
  const [formRole, setFormRole] = useState("");
  const [formYears, setFormYears] = useState(1);

  const resetForm = () => {
    setFormName("");
    setFormDept(DEPARTMENTS[0]);
    setFormRole("");
    setFormYears(1);
  };

  const openAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const openEditDialog = (person: Person) => {
    setFormName(person.name);
    setFormDept(person.department);
    setFormRole(person.role);
    setFormYears(person.yearsAtCompany);
    setEditPerson(person);
  };

  const handleAdd = async () => {
    if (!formName.trim()) { toast.error("名前を入力してください"); return; }
    const result = await addPerson({
      name: formName.trim(),
      department: formDept,
      role: formRole.trim(),
      yearsAtCompany: formYears,
      avatarInitial: formName.trim().charAt(0),
    });
    if (result) {
      toast.success(`${result.name}を追加しました`);
      setAddDialogOpen(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!editPerson || !formName.trim()) return;
    await updatePerson(editPerson.id, {
      name: formName.trim(),
      department: formDept,
      role: formRole.trim(),
      yearsAtCompany: formYears,
      avatarInitial: formName.trim().charAt(0),
    });
    toast.success("提案者情報を更新しました");
    setEditPerson(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deletePerson(deleteTarget.id);
    toast.success(`${deleteTarget.name}を削除しました`);
    setDeleteTarget(null);
  };

  const activePeople = people.filter(p => p.isActive);

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-6 max-w-[1100px] mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              提案者管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              改善提案者の追加・編集・削除を行います。ここで管理されたメンバーが改善入力ページで選択可能になります。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PageHelpGuide
              title="提案者管理 — 使い方"
              overview="改善案の提案者（メンバー）を登録・管理するページです。ここで登録したメンバーが「改善入力と整理」ページの提案者選択に表示されます。"
              steps={[
                { icon: "➕", title: "提案者を追加", description: "「提案者を追加」ボタンで名前・部門・役職・入社年数を入力して新しいメンバーを登録します。", result: "登録したメンバーは即座に改善入力ページの提案者一覧に反映されます" },
                { icon: "✏️", title: "情報を編集", description: "各メンバーの鉛筆アイコンで部門・役職などの情報を編集できます。" },
                { icon: "🗑️", title: "メンバーを削除", description: "ゴミ箱アイコンでメンバーを削除できます。紐づいた改善案は残ります。" },
              ]}
              tips={[
                "改善案を登録する前に、まず提案者を追加してください。",
                "部門は改善案の部門統計やインパクトの見える化に連動します。",
              ]}
            />
            <Button className="gap-1.5" onClick={openAddDialog}>
              <UserPlus className="w-4 h-4" />
              提案者を追加
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">登録者数</p>
                <p className="text-xl font-bold text-foreground">{activePeople.length}名</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">所属部門数</p>
                <p className="text-xl font-bold text-foreground">{new Set(activePeople.map(p => p.department)).size}部門</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">平均勤続年数</p>
                <p className="text-xl font-bold text-foreground">
                  {activePeople.length > 0 ? (activePeople.reduce((s, p) => s + p.yearsAtCompany, 0) / activePeople.length).toFixed(1) : 0}年
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* People List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">登録済み提案者</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activePeople.map((person) => {
                const kaizenCount = getKaizenByPerson(person.id).length;
                return (
                  <div key={person.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                      {person.avatarInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{person.name}</span>
                        <Badge variant="outline" className="text-xs">{person.role}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{person.department}</span>
                        <span>入社{person.yearsAtCompany}年目</span>
                        <span className="text-primary">{kaizenCount}件の改善案</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(person)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(person)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {activePeople.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  提案者がまだ登録されていません。「提案者を追加」ボタンから登録してください。
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>提案者を追加</DialogTitle>
          </DialogHeader>
          <PersonForm
            name={formName} setName={setFormName}
            dept={formDept} setDept={setFormDept}
            role={formRole} setRole={setFormRole}
            years={formYears} setYears={setFormYears}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">キャンセル</Button>
            </DialogClose>
            <Button onClick={handleAdd}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPerson} onOpenChange={(open) => { if (!open) setEditPerson(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>提案者を編集</DialogTitle>
          </DialogHeader>
          <PersonForm
            name={formName} setName={setFormName}
            dept={formDept} setDept={setFormDept}
            role={formRole} setRole={setFormRole}
            years={formYears} setYears={setFormYears}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">キャンセル</Button>
            </DialogClose>
            <Button onClick={handleEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget?.name}を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。この提案者に紐づいた改善案は残りますが、提案者情報は表示されなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

const PersonForm = ({
  name, setName, dept, setDept, role, setRole, years, setYears,
}: {
  name: string; setName: (v: string) => void;
  dept: string; setDept: (v: string) => void;
  role: string; setRole: (v: string) => void;
  years: number; setYears: (v: number) => void;
}) => (
  <div className="space-y-4">
    <div>
      <Label>氏名 <span className="text-destructive">*</span></Label>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="例: 山田 太郎" className="mt-1" />
    </div>
    <div>
      <Label>部門</Label>
      <select
        value={dept}
        onChange={e => setDept(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>役職</Label>
        <Input value={role} onChange={e => setRole(e.target.value)} placeholder="例: チームリーダー" className="mt-1" />
      </div>
      <div>
        <Label>入社年数</Label>
        <Input type="number" min={1} max={50} value={years} onChange={e => setYears(Number(e.target.value))} className="mt-1" />
      </div>
    </div>
  </div>
);

export default PeopleManagementPage;
