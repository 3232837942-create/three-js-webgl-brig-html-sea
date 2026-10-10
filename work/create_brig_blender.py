import bpy, math
from mathutils import Vector

OUT_BLEND=r'C:\Users\32328\Documents\Codex\2026-09-06\three-js-webgl-brig-html-sea\outputs\black_tern_brig.blend'
OUT_GLB=r'C:\Users\32328\Documents\Codex\2026-09-06\three-js-webgl-brig-html-sea\outputs\black_tern_brig.glb'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0, rough=.65, emission=None):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metallic; p.inputs['Roughness'].default_value=rough
    if emission: p.inputs['Emission Color'].default_value=(*emission,1); p.inputs['Emission Strength'].default_value=2.5
    return m
wood=material('MAT_Wood_Warm',(.20,.055,.014),0,.5); planks=material('MAT_Wood_Planks',(.38,.14,.035),0,.58); dark=material('MAT_Wood_Edges',(.07,.018,.006),0,.42); iron=material('MAT_Black_Iron',(.018,.024,.03),.82,.25); bronze=material('MAT_Bronze',(.32,.11,.02),.75,.3); canvas=material('MAT_Canvas',(.68,.56,.38),0,.86); glow=material('MAT_Lantern_Glow',(.95,.33,.015),0,.3,(.95,.18,.01)); bilge=material('MAT_Bilge_Water',(.01,.16,.18),.1,.2)
root=bpy.data.objects.new('BRIG_BLACK_TERN_ROOT',None); bpy.context.collection.objects.link(root)
def own(o,p=root): o.parent=p; return o
def cube(n,loc,sc,ma,p=root,bev=0):
    bpy.ops.mesh.primitive_cube_add(location=loc); o=bpy.context.object; o.name=n; o.scale=sc; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(ma); own(o,p)
    if bev: mod=o.modifiers.new('Soft_Edges','BEVEL'); mod.width=bev; mod.segments=2
    return o
def cyl(n,loc,r,d,ma,p=root,rot=(0,0,0),verts=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d,location=loc,rotation=rot); o=bpy.context.object; o.name=n; o.data.materials.append(ma); return own(o,p)
def torus(n,loc,major,minor,ma,p=root,rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=16,minor_segments=6,location=loc,rotation=rot); o=bpy.context.object; o.name=n; o.data.materials.append(ma); return own(o,p)
def empty(n,loc,p=root): o=bpy.data.objects.new(n,None); bpy.context.collection.objects.link(o); o.location=loc; return own(o,p)
def rod(n,a,b,r,ma,p=root):
    a,b=Vector(a),Vector(b); d=b-a; o=cyl(n,(a+b)*.5,r,d.length,ma,p); o.rotation_mode='QUATERNION'; o.rotation_quaternion=Vector((0,0,1)).rotation_difference(d.normalized()); return o

# Faceted hull with a rounded U-shaped bottom and two usable deck levels.
# Each longitudinal ring is a 9-point transverse section from port sheer to starboard sheer.
rings=[(-9.2,.35),(-7.4,2.2),(-3,2.95),(2.8,3.0),(7.7,2.35),(9,1.25)]
section=[(-.94,3.25),(-1.00,2.55),(-.93,1.65),(-.70,.72),(0.0,.16),(.70,.72),(.93,1.65),(1.00,2.55),(.94,3.25)]
v=[]
for y,w in rings:
    for sx,zz in section: v.append((sx*w,y,zz))
f=[]; count=len(section)
for i in range(len(rings)-1):
    a=i*count; b=(i+1)*count
    for j in range(count-1): f.append((a+j,b+j,b+j+1,a+j+1))
f += [tuple(range(count-1,-1,-1)),tuple((len(rings)-1)*count+j for j in range(count))]
me=bpy.data.meshes.new('HULL_FACETED_MESH'); me.from_pydata(v,[],f); me.materials.append(wood); hull=bpy.data.objects.new('HULL_DOUBLE_DECK',me); bpy.context.collection.objects.link(hull); own(hull)
for z in (.45,1.05,1.7,2.35,2.9):
    for side in (-1,1): rod('HULL_BELT',(side*2.8,-7.4,z),(side*2.25,7.8,z),.045,dark)
for deck,z in [('GUN_DECK',1.05),('MAIN_DECK',3.42),('AFT_DECK',5.05)]:
    for y in [(-7.8+i*.42) for i in range(37)]: cube(deck+'_PLANK',(0,y,z),(2.2 if abs(y)<5 else 1.75,.18,.055),planks)
for side in (-1,1):
    for y in [-7.2+i*.8 for i in range(20)]:
        if 4.5<y<6: continue
        w=2.55 if abs(y)<4 else 2.15; cube('RAIL_POST',(side*w,y,4.18),(.055,.055,.52),dark)
    rod('RAIL_TOP',(side*2.5,-7.5,4.72),(side*2.1,7.8,5.55),.06,dark)
for i in range(9):
    cube('STAIR_PORT',(-2.1,3.0+i*.27,3.55+i*.17),(.45,.13,.13),planks); cube('STAIR_STARBOARD',(2.1,3.0+i*.27,3.55+i*.17),(.45,.13,.13),planks)
cube('CAPTAIN_QUARTERS',(0,7.1,4.3),(2.25,1.55,.85),wood)
for x in (-1.25,0,1.25): cube('CABIN_WINDOW',(x,8.72,4.3),(.38,.025,.42),glow)

# Animation pivots: hatch, captain door, sails, gunports, helm, anchor, pump.
hatchp=empty('INTERACT_HATCH_PIVOT',(-1.05,3.5,1.25)); cube('INTERACT_HATCH_DOOR',(0,0,0),(1.05,1.05,.08),dark,hatchp); hatchp['runtime_control']='hatch'
doorp=empty('INTERACT_CAPTAIN_DOOR_PIVOT',(-.75,3.45,4.9)); cube('INTERACT_CAPTAIN_DOOR',(.7,1.0,0),(.7,1,.07),dark,doorp); doorp['runtime_control']='door'
for mi,y in enumerate((-3.2,2.4)):
    tag='FORE' if mi==0 else 'MAIN'; cyl(tag+'_MAST',(0,y,8),.23,13 if mi==0 else 15,dark)
    for si,(z,w,h) in enumerate(((11.6,4.4,2.5),(8.8,5.7,3.0),(6.1,6.7,3.1))):
        p=empty('INTERACT_'+tag+'_SAIL_%s_PIVOT'%si,(0,y,z)); rod(tag+'_YARD_%s'%si,(-w*.58,y,z),(w*.58,y,z),.09,dark,p); cube('INTERACT_'+tag+'_SAIL_%s'%si,(0,y-.03,z-h/2),(w*.44,.025,h/2),canvas,p); p['runtime_control']='sail'
    for sx in (-1,1): rod(tag+'_STAY',(0,y,12),(sx*2.55,-8.4,3.4),.018,dark)
rod('BOWSPRIT',(0,-8.2,4),(0,-13.2,5.7),.15,dark); jp=empty('INTERACT_JIB_SAIL_PIVOT',(0,-8.3,5.1)); cube('INTERACT_JIB_SAIL',(0,0,2.6),(.025,.06,2.6),canvas,jp)

def cannon(side,y,deck,index):
    z=3.86 if deck=='UPPER' else 1.52; x=side*(2.5 if deck=='UPPER' else 2.62); p=empty('CANNON_%s_%s_%s'%(deck,'PORT' if side<0 else 'STARBOARD',index),(x,y,z)); cube(p.name+'_CARRIAGE',(0,0,.12),(.43,.58,.18),dark,p); cyl(p.name+'_BARREL',(0,side*.08,.38),.19,1.35,iron,p,rot=(math.pi/2,0,0)); rod(p.name+'_TRUNNION',(-.28,0,.38),(.28,0,.38),.06,bronze,p); p['runtime_control']='cannon'
    if deck=='LOWER': gp=empty('INTERACT_GUNPORT_%s_%s_PIVOT'%('PORT' if side<0 else 'STARBOARD',index),(side*2.82,y,1.9)); cube(gp.name+'_COVER',(side*.06,0,0),(.07,.74,.72),planks,gp); gp['runtime_control']='gunport'
for side in (-1,1):
    for i,y in enumerate((-4.25,2.55),1): cannon(side,y,'UPPER',i)
    for i,y in enumerate((-5.1,-1.45,2.2),1): cannon(side,y,'LOWER',i)

helm=empty('INTERACT_HELM_PIVOT',(0,6.5,6)); torus('INTERACT_SHIP_WHEEL',(0,0,.1),.72,.065,dark,helm,rot=(math.pi/2,0,0))
for i in range(8): a=i*math.tau/8; rod('WHEEL_SPOKE',(0,0,.1),(math.cos(a)*.72,math.sin(a)*.72,.1),.035,planks,helm)
helm['runtime_control']='rudder'; cyl('WHEEL_PEDESTAL',(0,6.5,5.25),.18,1.5,dark)
cap=empty('INTERACT_CAPSTAN_ANCHOR',(0,-6.4,3.7)); cyl('CAPSTAN_BARREL',(0,0,0),.25,.65,dark,cap); rod('CAPSTAN_BAR',(-1,0,.18),(1,0,.18),.055,planks,cap); cap['runtime_control']='anchor'
anc=empty('INTERACT_ANCHOR_ROOT',(-2.8,-8.2,2.7)); rod('ANCHOR_SHANK',(0,0,0),(0,0,-1.8),.075,iron,anc); rod('ANCHOR_STOCK',(-.55,0,-.22),(.55,0,-.22),.07,iron,anc)
for sx in (-1,1): rod('ANCHOR_FLUKE',(0,0,-1.65),(sx*.56,0,-1.22),.09,iron,anc)
for i in range(16): torus('ANCHOR_CHAIN_LINK',(0,0,-i*.14),.075,.017,iron,anc,rot=(math.pi/2*(i%2),0,0))
pump=empty('INTERACT_BILGE_PUMP',(-1.25,1.45,1.15)); cyl('PUMP_BODY',(0,0,.42),.14,.85,bronze,pump); rod('PUMP_HANDLE',(-.48,0,.84),(.48,0,.84),.045,planks,pump); pump['runtime_control']='pump'; cube('BILGE_WATER',(0,0,1.08),(2.2,6.9,.025),bilge)
for i,(x,y,z) in enumerate(((-2.55,-6.7,4.4),(2.55,-6.7,4.4),(-2.62,6.8,5.7),(2.62,6.8,5.7),(0,5.45,5.25))): g=empty('INTERACT_LANTERN_%s'%i,(x,y,z)); cyl('LANTERN_FRAME',(0,0,0),.14,.44,iron,g); cyl('LANTERN_GLOW',(0,0,0),.1,.32,glow,g); g['runtime_control']='lantern'
for n,loc in [('ATTACH_PLAYER_MAIN',(0,0,5.05)),('ATTACH_PLAYER_GUN',(0,0,1.38)),('ATTACH_CAMERA_THIRD',(0,14,10)),('ATTACH_BOW_WAKE',(0,-9.6,1.7)),('ATTACH_STERN_WAKE',(0,9.3,1.2))]: empty(n,loc)
bpy.context.scene.world.color=(.025,.04,.06); bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND); bpy.ops.object.select_all(action='SELECT')
try:
    bpy.ops.export_scene.gltf(filepath=OUT_GLB,export_format='GLB',export_materials='EXPORT',export_apply=True,export_yup=True)
except TypeError:
    bpy.ops.export_scene.gltf(filepath=OUT_GLB,export_format='GLB',export_materials='EXPORT',export_apply=True)
print('EXPORTED',len(bpy.context.scene.objects),OUT_BLEND,OUT_GLB)
