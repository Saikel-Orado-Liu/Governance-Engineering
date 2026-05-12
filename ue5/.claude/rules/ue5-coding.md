---
paths:
  - "Source/**/*.h"
  - "Source/**/*.cpp"
  - "Source/**/*.Build.cs"
  - "Source/**/*.Target.cs"
  - "Source/**/*.cs"
---

# UE5 C++ 编码规范

> 操作 Source/ 文件时自动注入。合并 cpp-critical + ue5-module。

## UObject 安全（违反即崩溃）

- 所有 UObject* 成员必须用 `UPROPERTY()` 保护，否则 GC 会回收导致悬空指针
- 禁止 `std::shared_ptr` / `std::unique_ptr` 包装 UObject 派生类
- 禁止 `dynamic_cast` 用于 UObject — 用 `Cast<T>()` 或 `CastChecked<T>()`
- 禁止在构造函数/析构函数中调用虚函数（vtable 未完全建立）
- 裸指针持有 UObject 引用用 `TObjectPtr<T>`

## 命名规范

- Actor: `A` 前缀 | UObject: `U` 前缀 | 非 UObject 类/结构体: `F` 前缀
- 接口: `I` 前缀 | 枚举: `E` 前缀（必须 `enum class`）| 模板: `T` 前缀
- bool 变量: `b` 前缀 | 函数: PascalCase 动词开头
- 宏: `UPPER_SNAKE_CASE` | 输出参数: `Out` 前缀

## 头文件

- 使用 `#pragma once`，禁止 `#define` 头文件防护
- `#include "ClassName.generated.h"` 必须作为最后一个 include
- 头文件中禁止 `using namespace` / `using std::`
- 头文件中优先前向声明，而非 `#include`
- 包含顺序: 自身头 → C 系统 → C++ 标准 → 第三方 → 项目 → `.generated.h` 最后

## 内存与指针

- 禁止裸露 `new`/`delete` — 用 `MakeShared`/`MakeUnique`
- 禁止 `malloc`/`free` | 始终用 `nullptr`（非 `NULL`/`0`）
- 禁止 C 风格类型转换 `(type)value` — 用 `static_cast<>`
- 禁止 `std::auto_ptr`

## UE 专有类型

- 容器用 `TArray`/`TMap`/`TSet`（不用 `std::vector`/`map`/`set`）
- 字符串用 `FString`/`FName`/`FText`（不用 `std::string`）
- 标识符用 `FName` | UI 文本用 `FText`
- 日志用 `UE_LOG`（不用 `std::cout`）| 断言用 `check`/`ensure`（不用 `assert`）

## 反射系统

- 所有 UObject 派生类必须包含 `GENERATED_BODY()` 宏
- `UFUNCTION()` / `UPROPERTY()` 标记优先于非标记的声明
- `PURE_VIRTUAL` 必须提供默认实现体
- `BlueprintNativeEvent` 必须有 `_Implementation` 函数
- Server RPC 必须带 `WithValidation` 和 `_Validate` 函数

## 模块与构建

- 跨模块引用必须在 `.Build.cs` 中声明
  - 公开头文件引用 → `PublicDependencyModuleNames`
  - 仅 .cpp 引用 → `PrivateDependencyModuleNames`
- 公开接口类标注 `<MODULE>_API` 导出宏
- 禁止模块间循环依赖
- 新建/删除模块同步更新 `.uproject` + 重新生成 `.sln`

## UObject 生命周期

- 异步销毁场景用 `TWeakObjectPtr<T>` 引用
- 延迟加载用 `TSoftObjectPtr<T>` / `TSoftClassPtr<T>`
- 绑定委托时对象可能销毁用 `BindWeakLambda` 而非 `BindLambda`
- `BeginPlay()` 不假设其他 Actor 初始化顺序
- `EndPlay()` 清理所有回调和委托

## 日志系统

- 每个模块定义独立日志类别: `DECLARE_LOG_CATEGORY_EXTERN` / `DEFINE_LOG_CATEGORY`
- 使用模块专用日志类别（非 `LogTemp`）
- `GEngine->AddOnScreenDebugMessage()` 必须 `#if !UE_BUILD_SHIPPING` 包裹
- `UE_LOG` verbose 信息用 `#if !UE_BUILD_SHIPPING` 排除

## 委托

- 单播: `DECLARE_DELEGATE` | 多播: `DECLARE_MULTICAST_DELEGATE`
- 动态单播: `DECLARE_DYNAMIC_DELEGATE` | 动态多播: `DECLARE_DYNAMIC_MULTICAST_DELEGATE`
- C++ 绑定动态委托: `AddDynamic(this, &ThisClass::FunctionName)`

## 禁止模式

- 禁止 C++ 异常（`try`/`catch`/`throw`）
- 禁止 `dynamic_cast` 用于 UObject（用 `Cast<T>`）
- 禁止 RTTI（`typeid`）
- `Tick()` 中禁止 `LoadObject`/`SpawnActor`/`Cast<T>`/大量内存分配
- 函数返回局部变量时禁止 `std::move`（阻止 RVO）
- Lambda 禁止默认捕获 `[&]`/`[=]` — 显式列出
- 禁止 `long double` — 仅用 `float`/`double`
- 禁止 `ActorIterator` 全量遍历（每帧）
- 禁止 `ConstructorHelpers` 之外同步加载资产
- 禁止硬编码资产路径 — 用 `TSoftObjectPtr` 或 DataAsset
- 禁止在 `PostLoad()`/`PostInitProperties()` 中访问其他 UObject

## UE 5.7 特定

- C++20 可用
- `GEngine->GetEngineVersion()` 已移除 → 用 `FEngineVersion::Current()` (`#include "Misc/EngineVersion.h"`)
- `TObjectPtr<T>` 是 UE 5.0+ 推荐方式
- `FProperty` 替代旧版 `UProperty`

## 性能

- `Tick()` 中禁止 `LoadObject`/`SpawnActor`/`Cast<T>`
- 缓存频繁访问数据 | 大对象传参用 const 引用
- 已知大小的容器用 `Reserve()` | 谨慎使用 `FORCEINLINE`
